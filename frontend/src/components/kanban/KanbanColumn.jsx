import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, MoreVertical } from 'lucide-react'
import TaskCard from './TaskCard'
import Dropdown, { DropdownItem } from '../common/Dropdown'

export default function KanbanColumn({
  column,
  tasks,
  onTaskClick,
  onAddTask,
  onEditColumn,
  onDeleteColumn,
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
  })

  const taskIds = tasks.map((t) => t.id)

  return (
    <div className="flex flex-col w-80 shrink-0">
      {/* Column header */}
      <div
        className="flex items-center justify-between px-3 py-2 rounded-t-lg"
        style={{ backgroundColor: `${column.color}20` }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: column.color }}
          />
          <h3 className="font-semibold text-sm text-text-primary">{column.name}</h3>
          <span className="text-xs text-text-secondary bg-surface px-1.5 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onAddTask}
            className="p-1 rounded hover:bg-surface transition-colors text-text-secondary hover:text-primary"
          >
            <Plus size={16} />
          </button>
          <Dropdown
            trigger={
              <button className="p-1 rounded hover:bg-surface transition-colors text-text-secondary hover:text-primary">
                <MoreVertical size={16} />
              </button>
            }
            align="right"
          >
            {({ close }) => (
              <>
                <DropdownItem
                  onClick={() => {
                    onEditColumn()
                    close()
                  }}
                >
                  Edit Column
                </DropdownItem>
                <DropdownItem
                  danger
                  onClick={() => {
                    onDeleteColumn()
                    close()
                  }}
                >
                  Delete Column
                </DropdownItem>
              </>
            )}
          </Dropdown>
        </div>
      </div>

      {/* Tasks */}
      <div
        ref={setNodeRef}
        className={`flex-1 p-2 space-y-3 bg-surface-secondary rounded-b-lg min-h-[200px] overflow-y-auto scrollbar-thin ${
          isOver ? 'bg-primary/5 ring-2 ring-dashed ring-primary' : ''
        }`}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={onTaskClick} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="text-center py-8 text-text-muted text-sm">
            No tasks
          </div>
        )}
      </div>
    </div>
  )
}
