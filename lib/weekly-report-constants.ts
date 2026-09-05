export const ACTIVITY_METRIC_KEYS = [
  "contacts_count",
  "tasks_created",
  "tasks_closed",
  "zero_contact_traders",
] as const;

export const METRIC_SOURCES: Record<string, string> = {
  active_traders:
    "кількість записів trader_weekly за обраний тиждень по трейдерах вашого портфеля",
  turnover: "сума turnover з trader_weekly за обраний тиждень по трейдерах вашого портфеля",
  cr: "середнє значення cr з trader_weekly за обраний тиждень по трейдерах вашого портфеля",
  score: "середнє значення score з trader_weekly за обраний тиждень по трейдерах вашого портфеля",
  green: "кількість трейдерів зі статусом green у trader_weekly за обраний тиждень",
  amber: "кількість трейдерів зі статусом amber у trader_weekly за обраний тиждень",
  red: "кількість трейдерів зі статусом red у trader_weekly за обраний тиждень",
  no_contact_5d:
    "розраховано з останнього запису в interactions по кожному трейдеру — 5+ днів без нового запису",
  overdue_tasks:
    "завдання зі статусом overdue або з простроченою due_date серед задач вашого портфеля",
  contacts_count: "кількість записів в interactions за цей тиждень, де ви — автор",
  tasks_created: "кількість задач у tasks, створених за цей тиждень і призначених на вас",
  tasks_closed:
    "кількість ваших задач зі статусом done, у яких due_date припадає на цей тиждень",
  zero_contact_traders:
    "трейдери вашого портфеля, по яких за цей тиждень немає жодного запису в interactions від вас",
};
