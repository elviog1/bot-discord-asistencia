require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const { google } = require("googleapis");
const cron = require("node-cron");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

// ==========================
// GOOGLE SHEETS
// ==========================
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// ==========================
// GUARDAR ASISTENCIA
// ==========================
async function guardarAsistencia() {
  try {
    console.log(`[${new Date().toISOString()}] Verificando asistencia...`);

    const canal1 = await client.channels.fetch(process.env.VOICE_CHANNEL_ID_1);

    const canal2 = await client.channels.fetch(process.env.VOICE_CHANNEL_ID_2);

    if (!canal1 || !canal1.isVoiceBased()) {
      console.log("Canal 1 inválido");
      return;
    }

    if (!canal2 || !canal2.isVoiceBased()) {
      console.log("Canal 2 inválido");
      return;
    }

    const miembrosMap = new Map();

    [...canal1.members.values(), ...canal2.members.values()].forEach(
      (member) => {
        miembrosMap.set(member.user.id, member);
      },
    );

    const miembros = [...miembrosMap.values()].filter(
      (member) => !member.user.bot,
    );

    console.log(`Usuarios encontrados: ${miembros.length}`);

    if (miembros.length === 0) {
      console.log("No hay usuarios conectados");
      return;
    }

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

    const valores = miembros.map((member) => [
      member.user.username,
      fecha,
      hora,
      member.voice.channel?.name || "Desconocido",
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: "Hoja 1!A:D",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: valores,
      },
    });

    console.log(`${valores.length} registros guardados correctamente`);
  } catch (error) {
    console.error("ERROR AL GUARDAR ASISTENCIA:");
    console.error(error);
  }
}

// ==========================
// BOT LISTO
// ==========================
client.once("ready", () => {
  console.log(`Bot conectado como ${client.user.tag}`);

  cron.schedule(
    "* * * * *",
    async () => {
      await guardarAsistencia();
    },
    {
      timezone: "America/Argentina/Buenos_Aires",
    },
  );

  console.log("Cron iniciado");
});

// ==========================
// EVENTOS DE CONEXIÓN
// ==========================
client.on("disconnect", () => {
  console.log("Bot desconectado");
});

client.on("resume", () => {
  console.log("Conexión reanudada");
});

// ==========================
// ERRORES GLOBALES
// ==========================
process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

// ==========================
// LOGIN
// ==========================
client.login(process.env.TOKEN);
