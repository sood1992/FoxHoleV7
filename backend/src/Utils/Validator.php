<?php
namespace App\Utils;

class Validator
{
    private array $errors = [];
    private array $data;

    public function __construct(array $data)
    {
        $this->data = $data;
    }

    public function required(string $field, string $message = null): self
    {
        if (!isset($this->data[$field]) || trim($this->data[$field]) === '') {
            $this->errors[$field] = $message ?? "{$field} is required";
        }
        return $this;
    }

    public function email(string $field, string $message = null): self
    {
        if (isset($this->data[$field]) && !filter_var($this->data[$field], FILTER_VALIDATE_EMAIL)) {
            $this->errors[$field] = $message ?? "Invalid email format";
        }
        return $this;
    }

    public function minLength(string $field, int $min, string $message = null): self
    {
        if (isset($this->data[$field]) && strlen($this->data[$field]) < $min) {
            $this->errors[$field] = $message ?? "{$field} must be at least {$min} characters";
        }
        return $this;
    }

    public function maxLength(string $field, int $max, string $message = null): self
    {
        if (isset($this->data[$field]) && strlen($this->data[$field]) > $max) {
            $this->errors[$field] = $message ?? "{$field} must not exceed {$max} characters";
        }
        return $this;
    }

    public function numeric(string $field, string $message = null): self
    {
        if (isset($this->data[$field]) && !is_numeric($this->data[$field])) {
            $this->errors[$field] = $message ?? "{$field} must be a number";
        }
        return $this;
    }

    public function in(string $field, array $values, string $message = null): self
    {
        if (isset($this->data[$field]) && !in_array($this->data[$field], $values)) {
            $this->errors[$field] = $message ?? "{$field} must be one of: " . implode(', ', $values);
        }
        return $this;
    }

    public function date(string $field, string $format = 'Y-m-d', string $message = null): self
    {
        if (isset($this->data[$field])) {
            $d = \DateTime::createFromFormat($format, $this->data[$field]);
            if (!$d || $d->format($format) !== $this->data[$field]) {
                $this->errors[$field] = $message ?? "{$field} must be a valid date ({$format})";
            }
        }
        return $this;
    }

    public function integer(string $field, string $message = null): self
    {
        if (isset($this->data[$field]) && !filter_var($this->data[$field], FILTER_VALIDATE_INT)) {
            $this->errors[$field] = $message ?? "{$field} must be an integer";
        }
        return $this;
    }

    public function boolean(string $field, string $message = null): self
    {
        if (isset($this->data[$field]) && !in_array($this->data[$field], [true, false, 0, 1, '0', '1', 'true', 'false'], true)) {
            $this->errors[$field] = $message ?? "{$field} must be a boolean";
        }
        return $this;
    }

    public function unique(string $field, string $table, string $column, ?int $excludeId = null, string $message = null): self
    {
        if (isset($this->data[$field])) {
            $sql = "SELECT COUNT(*) as count FROM {$table} WHERE {$column} = ?";
            $params = [$this->data[$field]];

            if ($excludeId !== null) {
                $sql .= " AND id != ?";
                $params[] = $excludeId;
            }

            $result = Database::fetch($sql, $params);
            if ($result && $result['count'] > 0) {
                $this->errors[$field] = $message ?? "{$field} already exists";
            }
        }
        return $this;
    }

    public function fails(): bool
    {
        return !empty($this->errors);
    }

    public function passes(): bool
    {
        return empty($this->errors);
    }

    public function errors(): array
    {
        return $this->errors;
    }

    public function validate(): void
    {
        if ($this->fails()) {
            Response::validationError($this->errors);
        }
    }

    public static function make(array $data): self
    {
        return new self($data);
    }
}
