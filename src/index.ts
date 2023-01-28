require("dotenv").config();

import { Client, Events, GatewayIntentBits } from "discord.js";
import gql from "graphql-tag";

import fightsProcessor from "./processor/fightsProcessor";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (c) => {
  console.log(`Ready. Logged in as ${c.user.tag}`);
});

client.once(Events.ClientReady, () => {
  const headers = new Headers();
  headers.append("Authorization", process.env["AUTH_TOKEN"] || "");
  headers.append("Content-Type", "application/json");
  headers.append("x-mock-response-name", "fights {");

  const graphql = JSON.stringify({
    query: gql`
      query ($reportCode: String) {
        rateLimitData {
          limitPerHour
          pointsSpentThisHour
          pointsResetIn
        }

        reportData {
          report(code: $reportCode) {
            fights {
              id
              encounterID
              name
              size
              difficulty

              startTime
              endTime
              bossPercentage
              fightPercentage
              lastPhase
              lastPhaseAsAbsoluteIndex

              kill
              completeRaid
              friendlyPlayers
              inProgress
            }
          }
        }
      }
    `,
    variables: { reportCode: "KazgYkZRwPxFvnTf", endTime: 1673216526 },
  });
  const requestOptions: RequestInit = {
    method: "POST",
    headers,
    body: graphql,
    redirect: "follow",
  };

  // https://www.fflogs.com/api/v2/client
  fetch(
    "https://42c04b7c-813f-4490-8d27-8212719a60ff.mock.pstmn.io/api/v2/client",
    requestOptions
  )
    .then((response) => {
      if (response.statusText === "Unauthorized") {
        console.log(response);
        throw new Error("unauthorized");
      } else {
        return response;
      }
    })
    .then((response) => response.text())
    .then(fightsProcessor)
    .catch((error) => console.log("error", error));
});

client.on("messageCreate", (message) => {
  console.log(message);
  console.log(message.embeds[0]);

  const embedUrl = String(message.embeds[0]?.data?.url);
  console.log({ embedUrl });
  const { reportId = "" } =
    embedUrl.match(/www.fflogs.com\/reports\/(?<reportId>[^\/]+)/)?.groups ??
    {};
  console.log({ reportId });
  if (reportId) {
    try {
      message.reply(reportId);
    } catch (error) {
      console.log("Message reply error", error);
    }
  }

  // if (message.content === "test") {
  //   try {
  //     message.reply("123");
  //   } catch (error) {
  //     console.log("Message reply error", error);
  //   }
  // }
});

client.login(process.env["DISCORD_TOKEN"]);
