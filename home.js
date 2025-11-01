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
// ✅ Post Upload Logic
const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");
const captionInput = document.getElementById("captionInput");
const postsContainer = document.getElementById("postsContainer"); // Your main feed section

// Make sure these exist in your HTML
if (uploadBtn && fileInput && captionInput && postsContainer) {
  uploadBtn.addEventListener("click", async () => {
    const file = fileInput.files[0];
    const caption = captionInput.value.trim();

    if (!file) return alert("Please choose a photo or video!");
    if (!caption) return alert("Add a caption!");

    // Upload to Supabase Storage
    const filePath = `${loggedInUser.id}/${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("posts") // name of your bucket in Supabase Storage
      .upload(filePath, file);

    if (uploadError) {
      console.error("Upload failed:", uploadError);
      alert("Upload failed!");
      return;
    }

    const { data: urlData } = supabase.storage
      .from("posts")
      .getPublicUrl(filePath);

    const fileUrl = urlData.publicUrl;
    const fileType = file.type.startsWith("video") ? "video" : "image";

    // Insert post record
    const { error: insertError } = await supabase.from("posts").insert([
      {
        author_id: loggedInUser.id,
        author_name: loggedInUser.full_name,
        author_initials: loggedInUser.full_name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase(),
        caption: caption,
        url: fileUrl,
        type: fileType,
      },
    ]);

    if (insertError) {
      console.error("Post insert error:", insertError);
      alert("Could not save post!");
    } else {
      alert("✅ Post uploaded successfully!");
      captionInput.value = "";
      fileInput.value = "";
      loadPosts(); // refresh feed
    }
  });
}
// ✅ Fetch and render posts
async function loadPosts() {
  const postsContainer = document.getElementById("postsContainer");
  if (!postsContainer) return;

  postsContainer.innerHTML = "<p style='color:#aaa;'>Loading posts...</p>";

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading posts:", error);
    postsContainer.innerHTML = "<p style='color:red;'>Failed to load posts.</p>";
    return;
  }

  postsContainer.innerHTML = "";

  posts.forEach((post) => {
    const postEl = document.createElement("div");
    postEl.className = "post-card";
    postEl.style = `
      background: rgba(255,255,255,0.05);
      border-radius: 14px;
      padding: 12px;
      margin-bottom: 16px;
      color: #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    `;

    postEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <div style="background:#128C7E;color:#fff;width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:50%;font-weight:600;">
          ${post.author_initials}
        </div>
        <div>
          <div style="font-weight:600;">${post.author_name}</div>
          <div style="font-size:12px;color:#aaa;">${new Date(
            post.created_at
          ).toLocaleString()}</div>
        </div>
      </div>

      ${
        post.type === "video"
          ? `<video controls style="width:100%;border-radius:10px;" src="${post.url}"></video>`
          : `<img src="${post.url}" style="width:100%;border-radius:10px;">`
      }

      <p style="margin-top:8px;">${post.caption}</p>
    `;

    postsContainer.appendChild(postEl);
  });
}

window.addEventListener("DOMContentLoaded", loadPosts);
