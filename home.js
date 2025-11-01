// ✅ Import Supabase client
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ✅ Supabase credentials
const supabaseUrl = "https://bipgnekdneqimjopldqo.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpcGduZWtkbmVxaW1qb3BsZHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzODExNTQsImV4cCI6MjA3Njk1NzE1NH0.KN5x779xsaJD6Aw9W6Q9I_E4DvlM7bAG7LilsW0GGtU";

const supabase = createClient(supabaseUrl, supabaseKey);

// ✅ Retrieve logged-in user
const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));

if (!loggedInUser) {
  // Not logged in → redirect
  alert("You must log in first!");
  window.location.href = "index.html";
} else {
  console.log("✅ Logged in as:", loggedInUser.full_name);
}

// ✅ Wait for page to load
window.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchBar");
  if (!searchInput) return;

  // --- Stylish dropdown setup ---
  const dropdown = document.createElement("div");
  dropdown.style.position = "absolute";
  dropdown.style.left = "0";
  dropdown.style.right = "0";
  dropdown.style.top = "45px";
  dropdown.style.background = "rgba(30, 30, 30, 0.9)";
  dropdown.style.borderRadius = "14px";
  dropdown.style.overflow = "hidden";
  dropdown.style.maxHeight = "280px";
  dropdown.style.overflowY = "auto";
  dropdown.style.display = "none";
  dropdown.style.zIndex = "9999";
  dropdown.style.boxShadow = "0 8px 20px rgba(0,0,0,0.5)";
  dropdown.style.backdropFilter = "blur(10px)";
  dropdown.style.border = "1px solid rgba(255,255,255,0.1)";
  searchInput.parentElement.style.position = "relative";
  searchInput.parentElement.appendChild(dropdown);

  const itemStyle =
    "padding: 12px 16px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: all 0.25s ease; border-bottom: 1px solid rgba(255,255,255,0.08);";
  const textStyle = "font-size: 15px; font-weight: 500; color: #f5f5f5;";

  // --- Live search logic ---
  searchInput.addEventListener("input", async (e) => {
    const query = e.target.value.trim();
    dropdown.innerHTML = "";
    if (!query) {
      dropdown.style.display = "none";
      return;
    }

    const { data, error } = await supabase
      .from("users")
      .select("id, full_name")
      .ilike("full_name", "%" + query + "%")
      .neq("id", loggedInUser.id) // ✅ Hide own account
      .limit(8);

    if (error) {
      console.error("Search error:", error);
      return;
    }

    if (!data || data.length === 0) {
      dropdown.innerHTML =
        '<div style="padding: 14px; color: #aaa; text-align:center;">No users found</div>';
      dropdown.style.display = "block";
      return;
    }

    data.forEach((user) => {
      const item = document.createElement("div");
      item.setAttribute("style", itemStyle);
      item.innerHTML = `<span style="${textStyle}">${user.full_name}</span>`;

      item.addEventListener("mouseenter", () => {
        item.style.background = "rgba(18, 140, 126, 0.4)";
        item.style.transform = "scale(1.02)";
      });
      item.addEventListener("mouseleave", () => {
        item.style.background = "transparent";
        item.style.transform = "scale(1)";
      });
      item.addEventListener("click", () => {
        window.location.href = "profile.html?id=" + user.id;
      });

      dropdown.appendChild(item);
    });

    dropdown.style.display = "block";
  });

  // --- Hide dropdown when clicking outside ---
  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = "none";
    }
  });
});
