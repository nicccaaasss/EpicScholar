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
// ✅ Elements
const postForm = document.getElementById("postForm");
const fileInput = document.getElementById("fileInput");
const captionInput = document.getElementById("captionInput");
const feedContainer = document.getElementById("feedContainer");

// ✅ Upload new post
postForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const file = fileInput.files[0];
  const caption = captionInput.value.trim();

  if (!file) {
    alert("Select a file to upload!");
    return;
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}_${loggedInUser.id}.${fileExt}`;
  const filePath = `${loggedInUser.id}/${fileName}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("posts")
    .upload(filePath, file);

  if (uploadError) {
    console.error("Upload failed:", uploadError);
    alert("Upload failed. Try again.");
    return;
  }

  const { data: publicUrlData } = supabase.storage
    .from("posts")
    .getPublicUrl(filePath);

  const type = file.type.startsWith("video") ? "video" : "image";
  const initials = loggedInUser.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  // Insert post into database
  const { error: insertError } = await supabase.from("posts").insert([
    {
      author_id: loggedInUser.id,
      author_name: loggedInUser.full_name,
      author_initials: initials,
      caption,
      url: publicUrlData.publicUrl,
      type,
    },
  ]);

  if (insertError) {
    console.error("Insert failed:", insertError);
    alert("Failed to post.");
    return;
  }

  captionInput.value = "";
  fileInput.value = "";

  alert("✅ Post uploaded!");
  renderFeed();
});

// ✅ Render feed (show others’ posts only)
async function renderFeed() {
  feedContainer.innerHTML =
    "<div class='loading' style='color:white;text-align:center;padding:30px;'>Loading posts...</div>";

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .neq("author_id", loggedInUser.id) // exclude own posts
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching posts:", error);
    feedContainer.innerHTML =
      "<div style='color:red;text-align:center;'>⚠️ Failed to load feed.</div>";
    return;
  }

  if (!posts || posts.length === 0) {
    feedContainer.innerHTML = `
      <div style="
        color: white;
        text-align: center;
        padding: 40px 0;
        font-size: 18px;
        opacity: 0.8;
      ">
        🎉 You’re all caught up!
      </div>`;
    return;
  }

  feedContainer.innerHTML = "";

  posts.forEach((post) => {
    const liked = post.liked_by?.includes(loggedInUser.id) || false;
    const loved = post.loved_by?.includes(loggedInUser.id) || false;

    const postEl = document.createElement("div");
    postEl.className = "post-card";
    postEl.innerHTML = `
      <div class="post-header">
        <div class="author-initials">${post.author_initials}</div>
        <div class="author-name">${post.author_name}</div>
      </div>
      <div class="post-caption">${post.caption}</div>
      ${
        post.type === "video"
          ? `<video controls src="${post.url}" class="post-video"></video>`
          : `<img src="${post.url}" class="post-image" />`
      }
      <div class="post-actions">
        <button class="like-btn ${liked ? "active" : ""}" onclick="toggleLike('${
      post.id
    }')">❤️ ${post.likes}</button>
        <button class="love-btn ${loved ? "active" : ""}" onclick="toggleLove('${
      post.id
    }')">💖 ${post.loves}</button>
      </div>
    `;
    feedContainer.appendChild(postEl);
  });
}

// ✅ Like system
async function toggleLike(postId) {
  const { data: post, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .single();

  if (error) return console.error(error);

  let liked_by = post.liked_by || [];
  let likes = post.likes;

  if (liked_by.includes(loggedInUser.id)) {
    liked_by = liked_by.filter((id) => id !== loggedInUser.id);
    likes--;
  } else {
    liked_by.push(loggedInUser.id);
    likes++;
  }

  const { error: updateError } = await supabase
    .from("posts")
    .update({ likes, liked_by })
    .eq("id", postId);

  if (!updateError) renderFeed();
}

// ✅ Love system
async function toggleLove(postId) {
  const { data: post, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .single();

  if (error) return console.error(error);

  let loved_by = post.loved_by || [];
  let loves = post.loves;

  if (loved_by.includes(loggedInUser.id)) {
    loved_by = loved_by.filter((id) => id !== loggedInUser.id);
    loves--;
  } else {
    loved_by.push(loggedInUser.id);
    loves++;
  }

  const { error: updateError } = await supabase
    .from("posts")
    .update({ loves, loved_by })
    .eq("id", postId);

  if (!updateError) renderFeed();
}

// ✅ Initial load
renderFeed();
