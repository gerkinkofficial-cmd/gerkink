import styles from './DataTable.module.css';

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
}

interface DataTableProps<T extends { id: string }> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
}

export default function DataTable<T extends { id: string }>({
  columns,
  data,
  emptyMessage = 'No records found.',
}: DataTableProps<T>) {
  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={styles.th}
                style={{ textAlign: col.align ?? 'left' }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.empty}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={row.id} className={styles.row}>
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={styles.td}
                    style={{ textAlign: col.align ?? 'left' }}
                  >
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[String(col.key)] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
