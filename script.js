```javascript
const API = "http://10.149.222.126:8000/docs";

const $ = id => document.getElementById(id);

function showLoading(show) {
    $("loading").classList.toggle("hidden", !show);
}

function showError(message) {
    $("error").textContent = message;
    $("error").classList.remove("hidden");

    setTimeout(() => {
        $("error").classList.add("hidden");
    }, 5000);
}

async function api(path) {
    const response = await fetch(API + path);

    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }

    return response.json();
}

function getTitle(item) {
    return item.title ||
           item.name ||
           item.movie_title ||
           item.original_title ||
           "Untitled";
}

function getPoster(item) {
    return item.poster ||
           item.poster_url ||
           item.image ||
           item.thumbnail ||
           "";
}

function getSlug(item) {
    return item.slug ||
           item.id ||
           item._id;
}

function createCard(item) {
    const card = document.createElement("div");
    card.className = "card";

    const poster = getPoster(item);
    const title = getTitle(item);
    const slug = getSlug(item);

    card.innerHTML = `
        <img src="${poster}" alt="${escapeHTML(title)}"
             onerror="this.style.visibility='hidden'">

        <div class="card-info">
            <div class="card-title">${escapeHTML(title)}</div>
            <div class="card-meta">
                ${item.year || item.release_date || ""}
            </div>
        </div>
    `;

    card.onclick = () => {
        if (slug !== undefined) {
            openDetails(slug);
        }
    };

    return card;
}

function renderMovies(container, data) {
    container.innerHTML = "";

    let items = data;

    if (!Array.isArray(items)) {
        items =
            data.results ||
            data.items ||
            data.movies ||
            data.data ||
            [];
    }

    items.forEach(item => {
        container.appendChild(createCard(item));
    });
}

async function loadHome() {
    try {
        showLoading(true);

        const trendingData = await api("/home/trending");
        renderMovies($("trending"), trendingData);

        try {
            const moviesData = await api("/movies");
            renderMovies($("movies"), moviesData);
        } catch {
            console.log("Movies endpoint unavailable");
        }

        try {
            const bannerData = await api("/home/banner");
            renderHero(bannerData);
        } catch {
            $("hero").innerHTML = `
                <div class="hero-content">
                    <h1>Welcome to MovieHub</h1>
                    <p>Browse your authorized movie and TV library.</p>
                </div>
            `;
        }

    } catch (error) {
        console.error(error);
        showError("Could not connect to the API.");
    } finally {
        showLoading(false);
    }
}

function renderHero(data) {
    let items = Array.isArray(data)
        ? data
        : data.items || data.results || data.data || [];

    if (!items.length) return;

    const item = items[0];

    const title = getTitle(item);
    const description =
        item.description ||
        item.overview ||
        item.synopsis ||
        "";

    const background =
        item.backdrop ||
        item.backdrop_url ||
        item.background ||
        item.image ||
        "";

    $("hero").style.backgroundImage =
        background ? `linear-gradient(to top, #0b0b0f, transparent), url("${background}")` : "";

    $("hero").innerHTML = `
        <div class="hero-content">
            <h1>${escapeHTML(title)}</h1>
            <p>${escapeHTML(description)}</p>
        </div>
    `;
}

async function searchMovies() {
    const query = $("searchInput").value.trim();

    if (!query) return;

    try {
        showLoading(true);

        const data = await api(
            `/search?q=${encodeURIComponent(query)}`
        );

        $("searchSection").classList.remove("hidden");
        renderMovies($("searchResults"), data);

        $("searchSection").scrollIntoView({
            behavior: "smooth"
        });

    } catch (error) {
        console.error(error);
        showError("Search failed.");
    } finally {
        showLoading(false);
    }
}

async function openDetails(slug) {
    try {
        showLoading(true);

        const data = await api(
            `/detail/${encodeURIComponent(slug)}`
        );

        const item = data.data || data;

        $("detailTitle").textContent = getTitle(item);

        $("detailDescription").textContent =
            item.description ||
            item.overview ||
            item.synopsis ||
            "No description available.";

        $("detailPoster").src = getPoster(item);

        setupSources(
            item.sources ||
            item.streams ||
            item.videos ||
            data.sources ||
            []
        );

        $("detailsModal").classList.remove("hidden");

    } catch (error) {
        console.error(error);
        showError("Could not load movie details.");
    } finally {
        showLoading(false);
    }
}

function setupSources(sources) {
    const languageSelect = $("languageSelect");
    const qualitySelect = $("qualitySelect");

    languageSelect.innerHTML = "";
    qualitySelect.innerHTML = "";

    if (!Array.isArray(sources) || !sources.length) {
        languageSelect.innerHTML =
            `<option>No authorized sources available</option>`;

        qualitySelect.innerHTML =
            `<option>No quality available</option>`;

        $("downloadButton").style.display = "none";
        return;
    }

    window.currentSources = sources;

    const languages = [
        ...new Set(
            sources.map(s =>
                s.language || s.lang || "Unknown"
            )
        )
    ];

    languages.forEach(language => {
        const option = document.createElement("option");
        option.value = language;
        option.textContent = language;
        languageSelect.appendChild(option);
    });

    updateQualities();

    languageSelect.onchange = updateQualities;
    qualitySelect.onchange = updatePlayer;
}

function updateQualities() {
    const language = $("languageSelect").value;

    const matching = window.currentSources.filter(s =>
        (s.language || s.lang || "Unknown") === language
    );

    $("qualitySelect").innerHTML = "";

    const qualities = [
        ...new Set(
            matching.map(s =>
                s.quality || s.resolution || "Auto"
            )
        )
    ];

    qualities.forEach(quality => {
        const option = document.createElement("option");
        option.value = quality;
        option.textContent = quality;
        $("qualitySelect").appendChild(option);
    });

    updatePlayer();
}

function getSelectedSource() {
    const language = $("languageSelect").value;
    const quality = $("qualitySelect").value;

    return window.currentSources.find(s =>
        (s.language || s.lang || "Unknown") === language &&
        (s.quality || s.resolution || "Auto") === quality
    );
}

function updatePlayer() {
    const source = getSelectedSource();

    if (!source) return;

    const url =
        source.url ||
        source.stream_url ||
        source.video_url;

    if (!url) return;

    $("videoPlayer").src = url;

    const downloadable =
        source.downloadable === true ||
        source.download_url;

    if (downloadable) {
        $("downloadButton").style.display = "inline-block";

        $("downloadButton").href =
            source.download_url || url;
    } else {
        $("downloadButton").style.display = "none";
    }
}

$("playButton").onclick = () => {
    const player = $("videoPlayer");

    if (!player.src) {
        showError("No authorized video source selected.");
        return;
    }

    player.play().catch(error => {
        console.log(error);
        showError("The browser could not start playback.");
    });
};

function closeDetails() {
    $("videoPlayer").pause();
    $("videoPlayer").removeAttribute("src");
    $("videoPlayer").load();

    $("detailsModal").classList.add("hidden");
}

$("searchBtn").onclick = searchMovies;

$("searchInput").addEventListener("keydown", event => {
    if (event.key === "Enter") {
        searchMovies();
    }
});

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

loadHome();
```
