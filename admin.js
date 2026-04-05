const SUPABASE_URL = "https://hizdsaynfaqqmulmitql.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpemRzYXluZmFxcW11bG1pdHFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzY0NDIsImV4cCI6MjA5MDgxMjQ0Mn0.3BtB_5kmg6JsBrAgxd9cAcRRMdDz5Ppu5dJZVgdwNjA";

function toonLoginStatus(tekst, type) {
  const el = document.getElementById("loginStatus");
  el.textContent = tekst;
  el.className = `admin-status admin-status--${type}`;
}

document.addEventListener("DOMContentLoaded", async () => {
  const loginClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Al ingelogd? Direct doorsturen.
  const { data: sessionData } = await loginClient.auth.getSession();
  if (sessionData.session) {
    window.location.replace("/admin-beheer");
    return;
  }

  document.getElementById("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    toonLoginStatus("Inloggen…", "info");

    const { data, error } = await loginClient.auth.signInWithPassword({ email, password });

    if (error) {
      toonLoginStatus("Inloggen mislukt. Controleer je gegevens.", "error");
      return;
    }

    if (data.user) {
      window.location.replace("/admin-beheer");
    }
  });
});
