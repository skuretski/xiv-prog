
import { mkdir, writeFile } from "node:fs/promises";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(duration);
dayjs.extend(relativeTime);

type Fight = {
  id: number;
  encounterID: number;
  fightPercentage: number | null | undefined;
  lastPhase: number | null | undefined;
  startTime: number;
  endTime: number;
};

const UWU_ENCOUNTER_ID = 1061;
export default async (response: string) => {
  // const dir = `./${new Date().toISOString()}` //! for 'prod'
  const dir = "./dev";
  const path = (await mkdir(dir, { recursive: true })) ?? dir;
  writeFile(`${path}/response.json`, response, { flag: "a+" });

  const fights: Fight[] =
    JSON.parse(response).data?.reportData?.report?.fights ?? [];
  // console.log({fights});
  // some fight reports have no data, where many fields are null,
  // and another typical symptom seems to be encounterID is 0
  const fightsByEncounterId = fights.reduce(
    (map, f) =>
      map.get(f.encounterID)?.push(f) ? map : map.set(f.encounterID, [f]),
    new Map<number, Fight[]>()
  );
  const uwuFights = fightsByEncounterId.get(UWU_ENCOUNTER_ID) ?? [];

  const timeMets = timeMetrics(uwuFights);
  console.log({ timeMets });

  console.log(uwuFights.length);
  console.log(
    uwuFights
      .filter((f) => f.fightPercentage != null)
      .map((f) => f.fightPercentage)
  );
  let { percentages, phases } = uwuFights.reduce(
    ({ percentages, phases }, { fightPercentage, lastPhase }) => {
      const hasPercentage = fightPercentage != null;
      const percentage = 100 - (fightPercentage || NaN);
      const hasPhase = lastPhase != null;

      return {
        percentages: {
          sum: percentages.sum + (hasPercentage ? percentage : 0),
          size: percentages.size + (hasPercentage ? 1 : 0),
          best: Math.max(
            percentages.best,
            hasPercentage ? percentage : -Infinity
          ),
          average: percentages.average,
        },

        phases: {
          sum: phases.sum + (hasPhase ? lastPhase : 0),
          size: phases.size + (hasPhase ? 1 : 0),
          best: Math.max(phases.best, hasPhase ? lastPhase : -Infinity),
          average: phases.average,
        },
      };
    },
    {
      percentages: { sum: 0, size: 0, best: -Infinity, average: NaN },
      phases: { sum: 0, size: 0, best: -Infinity, average: NaN },
    }
  );
  percentages.average = percentages.sum / (percentages.size || NaN);
  phases.average = phases.sum / (phases.size || NaN);
  console.log({ percentages, phases });

  return response;
};

const sum = (a: number, b: number) => a + b;
const max2 = (a: number, b: number) => Math.max(a, b);
const sumSqrDiff = (mean: number,tr:(_:number)=>number) => (a: number, b: number) => {
  return a + (tr(b) - tr(mean)) * (tr(b) - tr(mean));
};

const timeMetrics = (fights: Fight[]) => {
  if (!fights.length) return null; //?

  const sortedFights = [...fights].sort((f1, f2) => f1.id - f2.id);
  const firstStart = sortedFights[0].startTime;
  const lastEnd = sortedFights[sortedFights.length - 1].endTime;

  const totalTimeDiff = lastEnd - firstStart;
  const fightDurations = sortedFights.map((f) => f.endTime - f.startTime);
  const totalTimeInFights = fightDurations.reduce(sum, 0);
  const percentageInFights = (totalTimeInFights * 100) / totalTimeDiff;
  const longestFight = fightDurations.reduce(max2, -Infinity);

  const avgFightTime = totalTimeInFights / fights.length;
  const sdFightTime =
    1000 *
    Math.sqrt(
      fightDurations.reduce(sumSqrDiff(avgFightTime,(x:number)=>x/1000), 0) / fights.length
    );

  return {
    totalReportDuration: dayjs.duration(totalTimeDiff).format("H[h] mm[m]"),
    totalFights: fights.length,
    totalFightTime: `${dayjs
      .duration(totalTimeInFights)
      .format("H[h] mm[m]")} (${percentageInFights.toFixed(0)}% of total)`,
    longestFight: dayjs.duration(longestFight).format("m[m] ss[s]"),
    averageFightTime: `${dayjs
      .duration(avgFightTime)
      .format("m[m] ss[s]")} (${dayjs
      .duration(sdFightTime)
      .format("m[m] ss[s]")} SD)`,
  };
};
