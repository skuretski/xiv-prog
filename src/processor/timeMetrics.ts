const sum = (a: number, b: number) => a + b;
const max2 = (a: number, b: number) => Math.max(a, b);
const sumSqrDiff =
  (mean: number, tr: (_: number) => number) => (a: number, b: number) =>
    a + (tr(b) - tr(mean)) * (tr(b) - tr(mean));

interface Fight {
  startTime: number;
  endTime: number;
}

export default (fights: Fight[]) => {
  const numberOfFights = fights.length;
  if (!numberOfFights)
    return {
      numberOfFights,
      totalReportDuration: 0,
      totalFightTime: 0,
      percentOfTimeInFights: 0,
      longestFightTime: 0,
      averageFightTime: 0,
      fightTimeStdDev: 0,
    };

  const sortedFights = [...fights].sort(
    (f1, f2) => f1.startTime - f2.startTime
  );
  const firstFight = sortedFights[0];
  const lastFight = sortedFights[sortedFights.length - 1];
  const totalReportDuration = lastFight.endTime - firstFight.startTime;

  const fightDurations = sortedFights.map((f) => f.endTime - f.startTime);
  const totalFightTime = fightDurations.reduce(sum, 0);
  const percentOfTimeInFights = (totalFightTime * 100) / totalReportDuration;
  const longestFightTime = fightDurations.reduce(max2, -Infinity);

  const averageFightTime = totalFightTime / numberOfFights;
  const fightTimeStdDev =
    1000 *
    Math.sqrt(
      fightDurations.reduce(
        sumSqrDiff(averageFightTime, (x: number) => x / 1000),
        0
      ) / numberOfFights
    );

  return {
    totalReportDuration,
    numberOfFights,
    totalFightTime,
    percentOfTimeInFights,
    longestFightTime,
    averageFightTime,
    fightTimeStdDev,
  };
};
