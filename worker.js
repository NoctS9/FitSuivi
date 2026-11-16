
export default {
  async fetch(req, env) {
    const H = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,x-app-key",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Content-Type": "application/json"
    };

    const reply = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: H
      });

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: H });
    }

    const u = new URL(req.url);

    // Diagnostic : vérifier que le Worker fonctionne
    if (u.pathname === "/health" && req.method === "GET") {
      return reply({
        worker: "OK",
        gemini_configured: Boolean(env.GEMINI_KEY),
        pixabay_configured: Boolean(env.PIXABAY_KEY)
      });
    }

    // Photos Pixabay
    if (u.pathname === "/photo" && req.method === "GET") {
      try {
        if (!env.PIXABAY_KEY) {
          return reply({ error: "PIXABAY_KEY absente" }, 500);
        }

        const params = new URLSearchParams({
          key: env.PIXABAY_KEY,
          q: u.searchParams.get("q") || "",
          image_type: "photo",
          category: "food",
          safesearch: "true",
          per_page: "3"
        });

        const response = await fetch(
          "https://pixabay.com/api/?" + params
        );

        if (!response.ok) {
          return reply({
            error: "Pixabay a rejeté la requête",
            status: response.status
          }, 502);
        }

        const data = await response.json();
        const photo = data.hits?.[0]?.webformatURL;

        if (!photo) return reply({ url: "" });

        const image = await fetch(photo);
        if (!image.ok) {
          return reply({ error: "Image inaccessible" }, 502);
        }

        const buffer = new Uint8Array(await image.arrayBuffer());
        let binary = "";

        for (let i = 0; i < buffer.length; i += 8192) {
          binary += String.fromCharCode(
            ...buffer.subarray(i, i + 8192)
          );
        }

        return reply({
          url: "data:image/jpeg;base64," + btoa(binary)
        });

      } catch (err) {
        console.error("Erreur photos", err);
        return reply({ error: "Erreur du service photo" }, 500);
      }
    }

    // Appels IA
    if (u.pathname !== "/" || req.method !== "POST") {
      return reply({ error: "Route inconnue" }, 404);
    }

    if (!env.APP_KEY ||
        req.headers.get("x-app-key") !== env.APP_KEY) {
      return reply({ error: "Accès refusé" }, 401);
    }

    if (!env.GEMINI_KEY) {
      return reply({ error: "GEMINI_KEY absente" }, 500);
    }

    try {
      const { prompt, images = [] } = await req.json();

      if (typeof prompt !== "string" || !prompt.trim()) {
        return reply({ error: "Prompt manquant" }, 400);
      }

      const model = env.MODEL || "gemini-2.5-flash";

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "x-goog-api-key": env.GEMINI_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{
                text: "Réponds uniquement avec un JSON valide."
              }]
            },
            contents: [{
              role: "user",
              parts: [
                ...images.map(data => ({
                  inline_data: {
                    mime_type: "image/jpeg",
                    data
                  }
                })),
                { text: prompt }
              ]
            }],
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Erreur Gemini", response.status, data);

        return reply({
          error: data.error?.message || "Erreur Gemini",
          status: response.status
        }, 502);
      }

      const raw = (data.candidates?.[0]?.content?.parts || [])
        .map(part => part.text || "")
        .join("")
        .replace(/```json|```/g, "")
        .trim();

      if (!raw) {
        return reply({ error: "Réponse Gemini vide" }, 502);
      }

      try {
        return reply(JSON.parse(raw));
      } catch {
        return reply({ error: "JSON Gemini invalide" }, 502);
      }

    } catch (err) {
      console.error("Erreur Worker", err);
      return reply({ error: "Erreur interne du Worker" }, 500);
    }
  }
};
