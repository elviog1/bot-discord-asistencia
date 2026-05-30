require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const { google } = require("googleapis");
const cron = require("node-cron");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

// Google Sheets Auth
const auth = new google.auth.GoogleAuth({
  keyFile: "credenciales.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// Guardar asistencia
async function guardarAsistencia() {
  try {
    console.log("Verificando asistencia...");

    // Obtener canales
    const canal1 = await client.channels.fetch(process.env.VOICE_CHANNEL_ID_1);

    const canal2 = await client.channels.fetch(process.env.VOICE_CHANNEL_ID_2);

    // Validar canales
    if (!canal1 || !canal1.isVoiceBased()) {
      console.log("Canal 1 inválido");
      return;
    }

    if (!canal2 || !canal2.isVoiceBased()) {
      console.log("Canal 2 inválido");
      return;
    }

    // Unir usuarios sin duplicados
    const miembrosMap = new Map();

    [...canal1.members.values(), ...canal2.members.values()].forEach(
      (member) => {
        miembrosMap.set(member.user.id, member);
      },
    );

    const miembros = [...miembrosMap.values()];

    // Validar usuarios
    if (miembros.length === 0) {
      console.log("No hay usuarios conectados");
      return;
    }

    // Google Sheets
    const sheets = google.sheets({
      version: "v4",
      auth,
    });

    const ahora = new Date();

    const fecha = ahora.toLocaleDateString("es-AR");

    const hora = ahora.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Datos a guardar
    const valores = [];

    miembros.forEach((member) => {
      if (!member.user.bot) {
        valores.push([
          member.user.username,
          fecha,
          hora,
          member.voice.channel.name,
        ]);
      }
    });

    // Guardar en Sheets
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: "Hoja 1!A:D",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: valores,
      },
    });

    console.log("Asistencia guardada correctamente");
  } catch (error) {
    console.error("ERROR:");
    console.error(error);
  }
}

// Bot listo
client.once("ready", () => {
  console.log(`Bot conectado como ${client.user.tag}`);

  // Ejecutar todos los días a las 21:00
  cron.schedule(
    "* * * * *",
    () => {
      guardarAsistencia();
    },
    {
      timezone: "America/Argentina/Buenos_Aires",
    },
  );

  console.log("Cron iniciado");
});

// Login
client.login(process.env.TOKEN);
