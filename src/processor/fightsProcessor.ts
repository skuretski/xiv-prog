import { mkdir, writeFile } from "node:fs/promises";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import timeMetrics from "./timeMetrics";

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
  if (timeMets) {
    console.log(formatTimeMetrics(timeMets));
  }

  // console.log(uwuFights.length);
  // console.log(
  //   uwuFights
  //     .filter((f) => f.fightPercentage != null)
  //     .map((f) => f.fightPercentage)
  // );
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

const formatTimeMetrics = ({
  numberOfFights,
  totalReportDuration,
  totalFightTime,
  percentOfTimeInFights,
  longestFight,
  averageFightTime,
  fightTimeStdDev,
}:{
  numberOfFights:number,
  totalReportDuration:number,
  totalFightTime:number,
  percentOfTimeInFights:number,
  longestFight:number,
  averageFightTime:number,
  fightTimeStdDev:number,
}) => ({
  numberOfFights,
  totalReportDuration: dayjs.duration(totalReportDuration).format("H[h] mm[m]"),
  totalFightTimeAndPercentage: `${dayjs
    .duration(totalFightTime)
    .format("H[h] mm[m]")} (${percentOfTimeInFights.toFixed(0)}% of total)`,
  longestFight: dayjs.duration(longestFight).format("m[m] ss[s]"),
  averageFightTimeAndSd: `${dayjs
    .duration(averageFightTime)
    .format("m[m] ss[s]")} (${dayjs
    .duration(fightTimeStdDev)
    .format("m[m] ss[s]")} SD)`,
});
