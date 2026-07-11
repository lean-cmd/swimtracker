/**
 * Minimal TCX (Training Center XML) export for a finished swim.
 *
 * TCX is the one interchange format that carries CALORIES alongside distance
 * and time, and it imports cleanly into Strava (web upload), Garmin Connect,
 * and — via importer apps — Apple Health. A native "push" to those services
 * needs OAuth backends; the file keeps the MVP dependency-free.
 */
export function buildTcx({
  distanceMeters,
  elapsedSeconds,
  kcal,
  label,
}: {
  distanceMeters: number;
  elapsedSeconds: number;
  kcal: number;
  label: string;
}): string {
  // Stamp the swim as ending now, starting elapsed ago.
  const start = new Date(Date.now() - elapsedSeconds * 1000).toISOString();
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities>
    <Activity Sport="Other">
      <Id>${start}</Id>
      <Lap StartTime="${start}">
        <TotalTimeSeconds>${Math.round(elapsedSeconds)}</TotalTimeSeconds>
        <DistanceMeters>${Math.round(distanceMeters)}</DistanceMeters>
        <Calories>${Math.round(kcal)}</Calories>
        <Intensity>Active</Intensity>
        <TriggerMethod>Manual</TriggerMethod>
      </Lap>
      <Notes>${esc(label)}</Notes>
    </Activity>
  </Activities>
</TrainingCenterDatabase>
`;
}
