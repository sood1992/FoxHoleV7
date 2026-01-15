export const PRIORITIES = {
  low: { label: 'Low', color: 'info', bgClass: 'bg-info/10 text-info' },
  medium: { label: 'Medium', color: 'warning', bgClass: 'bg-warning/10 text-warning' },
  high: { label: 'High', color: 'danger', bgClass: 'bg-danger/10 text-danger' },
  urgent: { label: 'Urgent', color: 'danger', bgClass: 'bg-danger text-white' },
}

export const STATUSES = {
  blocked: { label: 'Blocked', color: 'muted', bgClass: 'bg-text-muted/20 text-text-secondary' },
  ready: { label: 'Ready', color: 'info', bgClass: 'bg-info/10 text-info' },
  in_progress: { label: 'In Progress', color: 'warning', bgClass: 'bg-warning/10 text-warning' },
  review: { label: 'Review', color: 'primary', bgClass: 'bg-primary/10 text-primary' },
  complete: { label: 'Complete', color: 'success', bgClass: 'bg-success/10 text-success' },
}

export const COMPLEXITIES = {
  trivial: { label: 'Trivial', xp: 5 },
  simple: { label: 'Simple', xp: 15 },
  medium: { label: 'Medium', xp: 30 },
  complex: { label: 'Complex', xp: 50 },
  epic: { label: 'Epic', xp: 100 },
}

export const PROJECT_STATUSES = {
  planning: { label: 'Planning', color: 'info' },
  active: { label: 'Active', color: 'success' },
  on_hold: { label: 'On Hold', color: 'warning' },
  completed: { label: 'Completed', color: 'primary' },
  archived: { label: 'Archived', color: 'muted' },
}

export const WORKFLOW_TEMPLATES = {
  video: 'Video Production',
  photography: 'Photography',
  design: 'Design',
  custom: 'Custom',
}

export const USER_ROLES = {
  admin: { label: 'Admin', color: 'danger' },
  pm: { label: 'Project Manager', color: 'primary' },
  employee: { label: 'Employee', color: 'info' },
}

export const LEVEL_TITLES = {
  1: 'Apprentice',
  6: 'Creator',
  11: 'Craftsman',
  16: 'Artist',
  21: 'Specialist',
  26: 'Expert',
  31: 'Master',
  41: 'Virtuoso',
  51: 'Legend',
}

export const getLevelTitle = (level) => {
  const thresholds = Object.keys(LEVEL_TITLES)
    .map(Number)
    .sort((a, b) => b - a)

  for (const threshold of thresholds) {
    if (level >= threshold) {
      return LEVEL_TITLES[threshold]
    }
  }
  return 'Apprentice'
}

export const NOTIFICATION_ICONS = {
  task_assigned: '📋',
  task_unblocked: '🔓',
  task_due_soon: '⏰',
  task_overdue: '🚨',
  task_completed: '✅',
  mentioned: '💬',
  comment_added: '💭',
  client_feedback: '📝',
  client_approved: '🎉',
  level_up: '⬆️',
  badge_earned: '🏆',
  streak_milestone: '🔥',
  shoot_reminder: '🎬',
}
