export function parseMpdResponse(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    if (line.startsWith("OK") || line.startsWith("ACK")) continue;
    const idx = line.indexOf(": ");
    if (idx > 0) result[line.slice(0, idx)] = line.slice(idx + 2);
  }
  return result;
}

export function parseMpdRecords(raw: string): Record<string, string>[] {
  const records: Record<string, string>[] = [];
  let current: Record<string, string> | null = null;
  for (const line of raw.split("\n")) {
    if (line.startsWith("OK") || line.startsWith("ACK")) continue;
    if (line === "") continue;
    const idx = line.indexOf(": ");
    if (idx <= 0) continue;
    const key = line.slice(0, idx);
    const value = line.slice(idx + 2);
    if (key === "file") {
      if (current) records.push(current);
      current = { file: value };
      continue;
    }
    if (current) current[key] = value;
  }
  if (current) records.push(current);
  return records;
}
