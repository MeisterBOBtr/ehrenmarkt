import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey
);

function euro(value: unknown): string {
  const number = Number(value || 0);

  return number.toLocaleString("de-DE", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function text(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "Keine Angabe";
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

function normalisiereAuftragsart(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss");
}

function istDiscordArchiv(value: unknown): boolean {
  const art = normalisiereAuftragsart(value);

  return (
    art === "bau" ||
    art === "bauauftrag" ||
    art === "redstone" ||
    art === "redstoneauftrag"
  );
}

function webhookFuerAuftrag(auftragsart: unknown): string | null {
  const art = normalisiereAuftragsart(auftragsart);

  if (art === "bau" || art === "bauauftrag") {
    return Deno.env.get("BAUAUFTRAG_WEBHOOK_URL") || null;
  }

  if (art === "redstone" || art === "redstoneauftrag") {
    return Deno.env.get("REDSTONE_WEBHOOK_URL") || null;
  }

  return null;
}

function erstelleDiscordEmbed(
  auftragsart: string,
  auftrag: Record<string, unknown>
) {
  const istRedstone =
    normalisiereAuftragsart(auftragsart).includes("redstone");

  const titel = istRedstone
    ? "Archivierter Redstone-Auftrag"
    : "Archivierter Bauauftrag";

  const farbe = istRedstone ? 0xff0000 : 0x8b5a2b;

  const felder = [
    {
      name: "Auftragsnummer",
      value: text(
        auftrag.order_number ||
        auftrag.auftragnummer ||
        auftrag.id
      ),
      inline: true,
    },
    {
      name: "Kunde",
      value: text(
        auftrag.customer_name ||
        auftrag.minecraft_name ||
        auftrag.kunde
      ),
      inline: true,
    },
    {
      name: "Titel",
      value: text(
        auftrag.title ||
        auftrag.auftragstitel ||
        auftrag.name
      ),
      inline: false,
    },
    {
      name: "Status",
      value: text(auftrag.status || "Abgeschlossen"),
      inline: true,
    },
    {
      name: "Gesamtpreis",
      value: euro(
        auftrag.total_price ||
        auftrag.gesamtpreis ||
        auftrag.gesamtsumme
      ),
      inline: true,
    },
    {
      name: "Anzahlung",
      value: euro(
        auftrag.deposit_price ||
        auftrag.anzahlung
      ),
      inline: true,
    },
    {
      name: "Restbetrag",
      value: euro(
        auftrag.remaining_payment ||
        auftrag.restbetrag
      ),
      inline: true,
    },
    {
      name: "Mitarbeiter",
      value: text(
        auftrag.employee_name ||
        auftrag.mitarbeiter ||
        auftrag.assigned_employee
      ),
      inline: true,
    },
    {
      name: "Arbeitszeit",
      value: text(
        auftrag.work_time ||
        auftrag.arbeitszeit ||
        auftrag.total_work_minutes
      ),
      inline: true,
    },
    {
      name: "Beschreibung",
      value: text(
        auftrag.description ||
        auftrag.beschreibung ||
        auftrag.notes
      ),
      inline: false,
    },
    {
      name: "Materialien",
      value: text(
        auftrag.materials ||
        auftrag.materialien ||
        auftrag.material_list
      ),
      inline: false,
    },
    {
      name: "Zusätzliche Informationen",
      value: text(
        auftrag.additional_information ||
        auftrag.zusatzinformationen ||
        auftrag.details
      ),
      inline: false,
    },
  ];

  return {
    title: titel,
    color: farbe,
    fields: felder,
    footer: {
      text: "Ehrenmarkt – Auftragsarchiv",
    },
    timestamp: new Date().toISOString(),
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Nur POST-Anfragen sind erlaubt.",
      }),
      {
        status: 405,
        headers: corsHeaders,
      }
    );
  }

  try {
    const body = await request.json();

    const auftragsart =
      body.order_type ||
      body.auftragsart ||
      body.type;

    const auftrag =
      body.order ||
      body.auftrag ||
      body.data ||
      body;

    const orderNumber =
      auftrag.order_number ||
      auftrag.auftragnummer ||
      auftrag.orderNumber ||
      String(auftrag.id || "");

    const totalPrice = Number(
      auftrag.total_price ||
      auftrag.gesamtpreis ||
      auftrag.gesamtsumme ||
      0
    );

    const workerTotal = Number(
      auftrag.worker_total ||
      auftrag.mitarbeiterkosten ||
      auftrag.worker_cost ||
      0
    );

    const clanProfit = Number(
      auftrag.clan_profit ||
      auftrag.clangewinn ||
      auftrag.clanProfit ||
      0
    );

    if (!auftragsart) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Die Auftragsart fehlt.",
        }),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    if (!orderNumber) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Die Auftragsnummer fehlt.",
        }),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    // ------------------------------------------------------------
    // FINANZEN FÜR ALLE AUFTRAGSARTEN SPEICHERN
    // Material, Redstone, Bauauftrag und Logistik
    // ------------------------------------------------------------

    const { error: financeError } = await supabase
      .from("order_finances")
      .insert({
        order_number: String(orderNumber),
        completed_at: new Date().toISOString(),
        total_price: totalPrice,
        clan_profit: clanProfit,
        worker_total: workerTotal,
        order_type: String(auftragsart),
      });

    if (financeError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Finanzen konnten nicht gespeichert werden.",
          details: financeError.message,
        }),
        {
          status: 500,
          headers: corsHeaders,
        }
      );
    }

    // ------------------------------------------------------------
    // DISCORD-ARCHIV NUR FÜR BAUAUFTRAG UND REDSTONE
    // ------------------------------------------------------------

    let discordGesendet = false;

    if (istDiscordArchiv(auftragsart)) {
      const webhookUrl = webhookFuerAuftrag(auftragsart);

      if (!webhookUrl) {
        return new Response(
          JSON.stringify({
            success: false,
            error:
              "Für diese Auftragsart wurde noch kein Discord-Webhook hinterlegt.",
          }),
          {
            status: 500,
            headers: corsHeaders,
          }
        );
      }

      const embed = erstelleDiscordEmbed(
        String(auftragsart),
        auftrag
      );

      const discordAntwort = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "Ehrenmarkt Archiv",
          embeds: [embed],
        }),
      });

      if (!discordAntwort.ok) {
        const discordFehler = await discordAntwort.text();

        return new Response(
          JSON.stringify({
            success: false,
            error: "Discord-Benachrichtigung konnte nicht gesendet werden.",
            details: discordFehler,
          }),
          {
            status: 500,
            headers: corsHeaders,
          }
        );
      }

      discordGesendet = true;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Auftrag wurde archiviert.",
        finanzenGespeichert: true,
        discordGesendet: discordGesendet,
        discordArchiv:
          istDiscordArchiv(auftragsart),
      }),
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Archivierung fehlgeschlagen.",
        details: error instanceof Error
          ? error.message
          : String(error),
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
});

// ENDE
