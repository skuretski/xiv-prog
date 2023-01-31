import { mkdir, writeFile } from "node:fs/promises";

import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(duration);
dayjs.extend(relativeTime);

import timeMetrics from "./timeMetrics";

type Fight = {
  // id: number;
  encounterID: number;
  fightPercentage: number | null | undefined;
  bossPercentage: number | null | undefined;
  lastPhase: number | null | undefined;
  startTime: number;
  endTime: number;
};

const UWU_ENCOUNTER_ID = 1061;
const bossByLastPhase = new Map([
  [1, "Garuda"],
  [2, "Ifrit"],
  [3, "Titan"],
  [4, "¿Lahabrea[D]?"], // haven't seen a lastPhase=4, only skips from 3 to 5
  [5, "Ultima Weapon"],
]);

const estimateBossAndPercentage = (fightPercentage: number) => {
  // estimateBossPercentage functions are based on figuring linear regressions of fflogs results,
  // and could change at any time.
  // It's possible to try to figure these regressions on fights while being processed,
  // so long as there at least two data points per phase in the set of fights (assuming linear).
  // Some data are more 'fixed' like fightPercentage 100 => phase = 1, boss %age = 100
  // fightPercentage 0 => phase = {LAST}, boss %age = 0, if last phase # is known

  const { estimateLastPhase = NaN, estimateBossPercentage = () => NaN } =
    [
      {
        estimateLastPhase: 1,
        minFightPercentage: 83.999,
        estimateBossPercentage: (fP: number) => (fP - 84) * 6.25,
      },
      {
        estimateLastPhase: 2,
        minFightPercentage: 67.999,
        estimateBossPercentage: (fP: number) => (fP - 68) * 6.25,
      },
      {
        estimateLastPhase: 3,
        minFightPercentage: 51.999,
        estimateBossPercentage: (fP: number) => (fP - 52) * 6.25,
      },
      {
        estimateLastPhase: 5,
        minFightPercentage: -0.001,
        estimateBossPercentage: (fP: number) => fP * 2,
      },
    ].find(({ minFightPercentage }) => fightPercentage > minFightPercentage) ??
    {};

  return {
    boss: bossByLastPhase.get(estimateLastPhase),
    bossPercentage: estimateBossPercentage(fightPercentage),
  };
};

export default async (response: string) => {
  // const dir = `./${new Date().toISOString()}` //! for 'prod'
  const dir = "./dev";
  const path = (await mkdir(dir, { recursive: true })) ?? dir;
  writeFile(`${path}/response.json`, response, { flag: "a+" });

  const fights: Fight[] =
    JSON.parse(response).data?.reportData?.report?.fights ?? [];
  // console.log({fights});

  const fightsByEncounterId = fights.reduce(
    (map, f) =>
      map.get(f.encounterID)?.push(f) ? map : map.set(f.encounterID, [f]),
    new Map<number, Fight[]>()
  );

  const uwuFights = fightsByEncounterId.get(UWU_ENCOUNTER_ID) ?? [];

  const timeMets = timeMetrics(uwuFights);
  console.log(formatTimeMetrics(timeMets));

  const percentages = uwuFights.reduce(
    (percentages, { fightPercentage }) => {
      const hasPercentage = fightPercentage != null;

      return {
        sum: percentages.sum + (hasPercentage ? fightPercentage : 0),
        size: percentages.size + (hasPercentage ? 1 : 0),
        best: Math.max(
          percentages.best,
          hasPercentage ? fightPercentage : -Infinity
        ),
        // average: percentages.average,
      };
    },
    {
      sum: 0,
      size: 0,
      best: -Infinity,
      // average: NaN,
    }
  );
  const averageFightPercentage = percentages.sum / (percentages.size || NaN);
  // console.log({ percentages, phases });
  console.log(
    {
      averageFightPercentage,
      effectively: estimateBossAndPercentage(averageFightPercentage)
    },
  );

  const sortedFights = [...uwuFights]
    .sort(
      (a, b) =>
        (a.fightPercentage ?? Infinity) - (b.fightPercentage ?? Infinity)
    )
    .map(({ bossPercentage, lastPhase, fightPercentage }) => ({
      boss:
        bossByLastPhase.get(lastPhase ?? NaN) ?? `Boss @ P${lastPhase ?? NaN}`,
      bossPercentage,
      fightPercentage,
    }));
  const takeBestN = 3;
  console.log(`best ${takeBestN} fight(s)`, sortedFights.slice(0,takeBestN));
  // console.log(sortedFights);

  return response;
};

const formatTimeMetrics = ({
  numberOfFights,
  totalReportDuration,
  totalFightTime,
  percentOfTimeInFights,
  longestFightTime,
  averageFightTime,
  fightTimeStdDev,
}: {
  numberOfFights: number;
  totalReportDuration: number;
  totalFightTime: number;
  percentOfTimeInFights: number;
  longestFightTime: number;
  averageFightTime: number;
  fightTimeStdDev: number;
}) => ({
  numberOfFights,
  totalReportDuration: dayjs.duration(totalReportDuration).format("H[h] mm[m]"),
  totalFightTime: dayjs.duration(totalFightTime).format("H[h] mm[m]"),
  fightTimePercentageOfDuration: `${percentOfTimeInFights.toFixed(0)}%`,
  longestFightTime: dayjs.duration(longestFightTime).format("m[m] ss[s]"),
  averageFightTimeAndSd: dayjs.duration(averageFightTime).format("m[m] ss[s]"),
  fightTimeStdDev: dayjs.duration(fightTimeStdDev).format("m[m] ss[s]"),
});
