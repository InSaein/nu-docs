"use client";

type Props = {
  query: string;
  status: string;
  statusOptions: Array<{ value: string; label: string }>;
};

export function StudentHistoryFilters({ query, status, statusOptions }: Props) {
  return (
    <form className="history-toolbar surface" method="get">
      <label className="toolbar-search">
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          name="query"
          defaultValue={query}
          placeholder="Search request ID or document"
          aria-label="Search request history"
        />
      </label>
      <select
        name="status"
        defaultValue={status}
        aria-label="Filter by status"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        <option value="">All statuses</option>
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </form>
  );
}
