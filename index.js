require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const { google } = require("googleapis");

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
// GUARDAR INGRESO
// ==========================
async function guardarIngreso(member, canal) {
  try {
    const sheets = google.sheets({
      version: "v4",
      auth,
    });

    const ahora = new Date();

    const fecha = ahora.toLocaleDateString("es-AR");

    const hora = ahora.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: "Hoja 1!A:E",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[member.user.username, fecha, hora, canal.name]],
      },
    });

    console.log(
      `${member.user.username} ingresó a ${canal.name} (${fecha} ${hora})`,
    );
  } catch (error) {
    console.error("ERROR AL GUARDAR INGRESO:");
    console.error(error);
  }
}

// ==========================
// BOT LISTO
// ==========================
client.once("ready", () => {
  console.log(`Bot conectado como ${client.user.tag}`);
});

// ==========================
// EVENTO DE INGRESO A VOZ
// ==========================
client.on("voiceStateUpdate", async (oldState, newState) => {
  try {
    const member = newState.member || oldState.member;

    if (!member || member.user.bot) return;

    const canalesMonitoreados = [
      process.env.VOICE_CHANNEL_ID_1,
      process.env.VOICE_CHANNEL_ID_2,
    ];

    const oldChannelId = oldState.channelId;
    const newChannelId = newState.channelId;

    const oldMonitoreado = canalesMonitoreados.includes(oldChannelId);
    const newMonitoreado = canalesMonitoreados.includes(newChannelId);

    const ahora = new Date();

    const fecha = ahora.toLocaleDateString("es-AR");

    const hora = ahora.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const sheets = google.sheets({
      version: "v4",
      auth,
    });

    let fila = null;

    // ==========================
    // INGRESO
    // ==========================
    if (!oldChannelId && newMonitoreado) {
      fila = [
        member.user.username,
        fecha,
        hora,
        newState.channel.name,
        "Ingreso",
      ];

      console.log(`${member.user.username} ingresó a ${newState.channel.name}`);
    }

    // ==========================
    // CAMBIO DE CANAL
    // ==========================
    else if (
      oldMonitoreado &&
      newMonitoreado &&
      oldChannelId !== newChannelId
    ) {
      fila = [
        member.user.username,
        fecha,
        hora,
        `${oldState.channel.name} → ${newState.channel.name}`,
        "Cambio de canal",
      ];

      console.log(
        `${member.user.username} cambió de ${oldState.channel.name} a ${newState.channel.name}`,
      );
    }

    // ==========================
    // SALIDA
    // ==========================
    else if (oldMonitoreado && !newChannelId) {
      fila = [
        member.user.username,
        fecha,
        hora,
        oldState.channel.name,
        "Salida",
      ];

      console.log(`${member.user.username} salió de ${oldState.channel.name}`);
    }

    if (!fila) return;

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: "Hoja 1!A:E",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [fila],
      },
    });
  } catch (error) {
    console.error("Error en voiceStateUpdate:");
    console.error(error);
  }
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
