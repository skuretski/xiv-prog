import {mkdir, writeFile} from "node:fs/promises";

type Fight = {
  encounterID: number;
  fightPercentage: number | null;
};

export default async (response: string) => {
  // const dir = `./${new Date().toISOString()}`
  const dir = "./dev";
  const path = (await mkdir(dir, {recursive: true})) ?? dir;
  writeFile(`${path}/response.json`, response, {flag: "a+"});

  let {fights = []}: {fights: Fight[]} =
    JSON.parse(response).data?.reportData?.report ?? {};
  // console.log({fights});
  // some fight reports have no data, where many fields are null,
  // and another typical symptom seems to be encounterID is 0
  fights = fights.filter((f) => f.encounterID);

  console.log(fights.length);
  console.log(fights.map((f) => f?.fightPercentage));

  return response;
};
