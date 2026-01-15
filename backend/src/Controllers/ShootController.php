<?php
namespace App\Controllers;

use App\Utils\Database;
use App\Utils\Response;
use App\Utils\Validator;
use App\Middleware\AuthMiddleware;
use App\Services\NotificationService;

class ShootController
{
    /**
     * GET /shoots
     */
    public static function index(): void
    {
        $user = AuthMiddleware::authenticate();

        $sql = "SELECT s.*, p.name as project_name, p.code as project_code,
                       u.name as created_by_name
                FROM shoots s
                INNER JOIN projects p ON s.project_id = p.id
                LEFT JOIN users u ON s.created_by = u.id";

        $params = [];

        // Filter by project access
        if (!AuthMiddleware::isAdmin()) {
            $sql .= " INNER JOIN project_members pm ON s.project_id = pm.project_id AND pm.user_id = ?";
            $params[] = $user['id'];
        }

        // Filter by date range
        if (isset($_GET['start_date'])) {
            $sql .= " WHERE s.shoot_date >= ?";
            $params[] = $_GET['start_date'];
        }
        if (isset($_GET['end_date'])) {
            $sql .= (strpos($sql, 'WHERE') !== false ? ' AND' : ' WHERE') . " s.shoot_date <= ?";
            $params[] = $_GET['end_date'];
        }

        // Filter by project
        if (isset($_GET['project_id'])) {
            $sql .= (strpos($sql, 'WHERE') !== false ? ' AND' : ' WHERE') . " s.project_id = ?";
            $params[] = $_GET['project_id'];
        }

        $sql .= " ORDER BY s.shoot_date ASC, s.call_time ASC";

        $shoots = Database::fetchAll($sql, $params);

        // Add crew count
        foreach ($shoots as &$shoot) {
            $crewCount = Database::fetch(
                "SELECT COUNT(*) as count FROM shoot_crew WHERE shoot_id = ?",
                [$shoot['id']]
            );
            $shoot['crew_count'] = (int) $crewCount['count'];
        }

        Response::success($shoots);
    }

    /**
     * GET /shoots/:id
     */
    public static function show(int $id): void
    {
        $user = AuthMiddleware::authenticate();

        $shoot = Database::fetch(
            "SELECT s.*, p.name as project_name, p.code as project_code,
                    u.name as created_by_name
             FROM shoots s
             INNER JOIN projects p ON s.project_id = p.id
             LEFT JOIN users u ON s.created_by = u.id
             WHERE s.id = ?",
            [$id]
        );

        if (!$shoot) {
            Response::notFound('Shoot not found');
        }

        if (!AuthMiddleware::canAccessProject($shoot['project_id'])) {
            Response::forbidden('You do not have access to this shoot');
        }

        // Get crew
        $shoot['crew'] = Database::fetchAll(
            "SELECT sc.*, u.name as user_name, u.email as user_email, u.phone as user_phone, u.avatar_url
             FROM shoot_crew sc
             LEFT JOIN users u ON sc.user_id = u.id
             WHERE sc.shoot_id = ?
             ORDER BY sc.call_time ASC",
            [$id]
        );

        // Get equipment
        $shoot['equipment'] = Database::fetchAll(
            "SELECT * FROM shoot_equipment WHERE shoot_id = ? ORDER BY equipment_name",
            [$id]
        );

        Response::success($shoot);
    }

    /**
     * POST /shoots
     */
    public static function store(): void
    {
        $user = AuthMiddleware::authenticate();
        AuthMiddleware::requireRole('admin', 'pm');

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $validator = Validator::make($data)
            ->required('project_id')
            ->integer('project_id')
            ->required('title')
            ->minLength('title', 2)
            ->required('shoot_date')
            ->date('shoot_date');

        $validator->validate();

        if (!AuthMiddleware::canManageProject($data['project_id'])) {
            Response::forbidden('You do not have permission to create shoots for this project');
        }

        $shootId = Database::insert('shoots', [
            'project_id' => $data['project_id'],
            'title' => $data['title'],
            'shoot_date' => $data['shoot_date'],
            'call_time' => $data['call_time'] ?? null,
            'end_time' => $data['end_time'] ?? null,
            'location_name' => $data['location_name'] ?? null,
            'location_address' => $data['location_address'] ?? null,
            'location_lat' => $data['location_lat'] ?? null,
            'location_lng' => $data['location_lng'] ?? null,
            'notes' => $data['notes'] ?? null,
            'created_by' => $user['id']
        ]);

        // Add crew if provided
        if (!empty($data['crew'])) {
            foreach ($data['crew'] as $crewMember) {
                Database::insert('shoot_crew', [
                    'shoot_id' => $shootId,
                    'user_id' => $crewMember['user_id'] ?? null,
                    'external_name' => $crewMember['external_name'] ?? null,
                    'external_phone' => $crewMember['external_phone'] ?? null,
                    'role_name' => $crewMember['role_name'],
                    'call_time' => $crewMember['call_time'] ?? null,
                    'status' => 'pending'
                ]);
            }
        }

        // Add equipment if provided
        if (!empty($data['equipment'])) {
            foreach ($data['equipment'] as $item) {
                Database::insert('shoot_equipment', [
                    'shoot_id' => $shootId,
                    'equipment_name' => $item['equipment_name'],
                    'quantity' => $item['quantity'] ?? 1,
                    'notes' => $item['notes'] ?? null
                ]);
            }
        }

        $shoot = Database::fetch("SELECT * FROM shoots WHERE id = ?", [$shootId]);

        Response::created($shoot, 'Shoot created successfully');
    }

    /**
     * PUT /shoots/:id
     */
    public static function update(int $id): void
    {
        $user = AuthMiddleware::authenticate();

        $shoot = Database::fetch("SELECT * FROM shoots WHERE id = ?", [$id]);
        if (!$shoot) {
            Response::notFound('Shoot not found');
        }

        if (!AuthMiddleware::canManageProject($shoot['project_id'])) {
            Response::forbidden('You do not have permission to update this shoot');
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $updateData = [];
        $allowedFields = ['title', 'shoot_date', 'call_time', 'end_time', 'location_name', 'location_address', 'location_lat', 'location_lng', 'notes'];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }

        if (!empty($updateData)) {
            Database::update('shoots', $updateData, 'id = ?', [$id]);
        }

        $updatedShoot = Database::fetch("SELECT * FROM shoots WHERE id = ?", [$id]);

        Response::success($updatedShoot, 'Shoot updated successfully');
    }

    /**
     * DELETE /shoots/:id
     */
    public static function destroy(int $id): void
    {
        AuthMiddleware::authenticate();

        $shoot = Database::fetch("SELECT * FROM shoots WHERE id = ?", [$id]);
        if (!$shoot) {
            Response::notFound('Shoot not found');
        }

        if (!AuthMiddleware::canManageProject($shoot['project_id'])) {
            Response::forbidden('You do not have permission to delete this shoot');
        }

        Database::delete('shoots', 'id = ?', [$id]);

        Response::success(null, 'Shoot deleted successfully');
    }

    /**
     * POST /shoots/:id/crew
     */
    public static function addCrew(int $id): void
    {
        AuthMiddleware::authenticate();

        $shoot = Database::fetch("SELECT * FROM shoots WHERE id = ?", [$id]);
        if (!$shoot) {
            Response::notFound('Shoot not found');
        }

        if (!AuthMiddleware::canManageProject($shoot['project_id'])) {
            Response::forbidden('You do not have permission to manage crew');
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $validator = Validator::make($data)
            ->required('role_name');

        $validator->validate();

        $crewId = Database::insert('shoot_crew', [
            'shoot_id' => $id,
            'user_id' => $data['user_id'] ?? null,
            'external_name' => $data['external_name'] ?? null,
            'external_phone' => $data['external_phone'] ?? null,
            'role_name' => $data['role_name'],
            'call_time' => $data['call_time'] ?? null,
            'status' => 'pending'
        ]);

        $crew = Database::fetch(
            "SELECT sc.*, u.name as user_name, u.email as user_email
             FROM shoot_crew sc
             LEFT JOIN users u ON sc.user_id = u.id
             WHERE sc.id = ?",
            [$crewId]
        );

        Response::created($crew, 'Crew member added');
    }

    /**
     * PUT /shoots/:id/crew/:crewId/status
     */
    public static function updateCrewStatus(int $id, int $crewId): void
    {
        AuthMiddleware::authenticate();

        $crew = Database::fetch(
            "SELECT sc.*, s.project_id FROM shoot_crew sc
             INNER JOIN shoots s ON sc.shoot_id = s.id
             WHERE sc.id = ? AND sc.shoot_id = ?",
            [$crewId, $id]
        );

        if (!$crew) {
            Response::notFound('Crew member not found');
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $validator = Validator::make($data)
            ->required('status')
            ->in('status', ['pending', 'confirmed', 'declined']);

        $validator->validate();

        Database::update('shoot_crew', ['status' => $data['status']], 'id = ?', [$crewId]);

        Response::success(null, 'Status updated');
    }

    /**
     * POST /shoots/:id/notify
     */
    public static function notify(int $id): void
    {
        $user = AuthMiddleware::authenticate();

        $shoot = Database::fetch("SELECT * FROM shoots WHERE id = ?", [$id]);
        if (!$shoot) {
            Response::notFound('Shoot not found');
        }

        if (!AuthMiddleware::canManageProject($shoot['project_id'])) {
            Response::forbidden('You do not have permission to send notifications');
        }

        // Get all crew with user IDs
        $crew = Database::fetchAll(
            "SELECT sc.*, u.id as uid FROM shoot_crew sc
             LEFT JOIN users u ON sc.user_id = u.id
             WHERE sc.shoot_id = ?",
            [$id]
        );

        $notified = 0;
        foreach ($crew as $member) {
            if ($member['uid']) {
                NotificationService::notifyShootReminder($member['uid'], $shoot);
                $notified++;
            }
        }

        Response::success(['notified_count' => $notified], "Sent {$notified} notifications");
    }

    /**
     * POST /shoots/:id/equipment
     */
    public static function addEquipment(int $id): void
    {
        AuthMiddleware::authenticate();

        $shoot = Database::fetch("SELECT * FROM shoots WHERE id = ?", [$id]);
        if (!$shoot) {
            Response::notFound('Shoot not found');
        }

        if (!AuthMiddleware::canManageProject($shoot['project_id'])) {
            Response::forbidden('You do not have permission to manage equipment');
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $validator = Validator::make($data)
            ->required('equipment_name');

        $validator->validate();

        $equipmentId = Database::insert('shoot_equipment', [
            'shoot_id' => $id,
            'equipment_name' => $data['equipment_name'],
            'quantity' => $data['quantity'] ?? 1,
            'notes' => $data['notes'] ?? null
        ]);

        $equipment = Database::fetch("SELECT * FROM shoot_equipment WHERE id = ?", [$equipmentId]);

        Response::created($equipment, 'Equipment added');
    }

    /**
     * DELETE /shoots/:id/equipment/:equipmentId
     */
    public static function removeEquipment(int $id, int $equipmentId): void
    {
        AuthMiddleware::authenticate();

        $equipment = Database::fetch(
            "SELECT se.*, s.project_id FROM shoot_equipment se
             INNER JOIN shoots s ON se.shoot_id = s.id
             WHERE se.id = ? AND se.shoot_id = ?",
            [$equipmentId, $id]
        );

        if (!$equipment) {
            Response::notFound('Equipment not found');
        }

        if (!AuthMiddleware::canManageProject($equipment['project_id'])) {
            Response::forbidden('You do not have permission to manage equipment');
        }

        Database::delete('shoot_equipment', 'id = ?', [$equipmentId]);

        Response::success(null, 'Equipment removed');
    }
}
