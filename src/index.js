require('dotenv').config();
const express = require('express');

const { Client, Events, GatewayIntentBits } = require('discord.js');
const app = express();

const client = new Client({ intents: [GatewayIntentBits.Guilds]});

client.once(Events.ClientReady, c => {
  console.log(`Ready. Logged in as ${c.user.tag}`);
});

client.login(process.env['DISCORD_TOKEN']);