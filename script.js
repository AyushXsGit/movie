// ======================================================
// MOVIEHUB - SCRIPT.JS
// ======================================================

const API = "https://moviebox-tui-api.onrender.com";
// const API = "http://127.0.0.1:8000";

// If backend is running on this laptop instead:
// // const API = "http://127.0.0.1:8000";


let currentMovie = null;

let selectedSeason = null;
let selectedEpisode = null;
let selectedQuality = null;


// ======================================================
// SELECTOR
// ======================================================

function $(selector) {
    return document.querySelector(selector);
}


// ======================================================
// JSON API
// ======================================================

async function api(path) {

    const response =
        await fetch(API + path);

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
}


// ======================================================
// HTML ESCAPE
// ======================================================

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// ======================================================
// TITLE
// ======================================================

function getTitle(item) {

    return (
        item?.name ||
        item?.title ||
        item?.subject?.title ||
        "Untitled"
    );
}


// ======================================================
// POSTER
// ======================================================

function getPoster(item) {

    return (
        item?.poster_url ||
        item?.poster ||
        item?.cover?.url ||
        item?.subject?.cover?.url ||
        ""
    );
}


// ======================================================
// MOVIE CARD
// ======================================================

function createMovieCard(movie) {

    const title =
        getTitle(movie);

    const poster =
        getPoster(movie);

    // Home API items use id.value.
    // Search results can use slug/subject_id.
    const slug =
        movie?.slug ||
        movie?.detailPath ||
        movie?.id?.value ||
        movie?.subject_id ||
        movie?.subjectId ||
        movie?.subject?.subject_id ||
        movie?.subject?.subjectId ||
        "";

    const subjectId =
        movie?.subject_id ||
        movie?.subjectId ||
        movie?.id?.value ||
        movie?.subject?.subject_id ||
        movie?.subject?.subjectId ||
        "";

    const rating =
        movie?.rating ||
        movie?.imdbRatingValue ||
        "";

    const card =
        document.createElement("div");

    card.className =
        "movie-card";

    card.innerHTML = `

        <img
            src="${escapeHTML(poster)}"
            alt="${escapeHTML(title)}"
            loading="lazy"
        >

        <div class="movie-card-info">

            <div class="movie-card-title">
                ${escapeHTML(title)}
            </div>

            ${
                rating
                ?
                `
                <div class="movie-card-meta">
                    ⭐ ${escapeHTML(rating)}
                </div>
                `
                :
                ""
            }

        </div>
    `;

    card.addEventListener(
        "click",
        () => {

            if (!slug) {

                console.error(
                    "Movie has no usable ID:",
                    movie
                );

                return;
            }

            openMovie(
                slug,
                subjectId
            );

        }
    );

    return card;
}


// ======================================================
// RENDER MOVIES
// ======================================================

function renderMovies(
    container,
    movies
) {

    container.innerHTML = "";

    if (
        !Array.isArray(movies) ||
        !movies.length
    ) {

        container.innerHTML = `
            <div class="loading">
            </div>
        `;

        return;
    }

    movies.forEach(movie => {

        container.appendChild(
            createMovieCard(movie)
        );

    });
}


// ======================================================
// HOME
// ======================================================

async function loadHome() {

    $("#featuredGrid").innerHTML =
        `<div class="loading">Loading...</div>`;

    $("#homeGrid").innerHTML = "";

    try {

        const data =
            await api("/home");

        console.log(
            "HOME API:",
            data
        );

        const sections =
            data?.sections || [];

        if (!sections.length) {

            $("#featuredGrid").innerHTML = `
                <div class="error">
                    No home data available.
                </div>
            `;

            return;
        }

        const banner =
            sections.find(
                section =>
                    String(
                        section?.section || ""
                    )
                    .toLowerCase()
                    .includes("banner")
            );

        const featuredMovies =
            banner?.items || [];

        renderMovies(
            $("#featuredGrid"),
            featuredMovies.slice(0, 8)
        );

        let allMovies = [];

        for (
            const section of sections
        ) {

            if (
                Array.isArray(
                    section?.items
                )
            ) {

                allMovies.push(
                    ...section.items
                );

            }

        }

        const seen =
            new Set();

        allMovies =
            allMovies.filter(
                movie => {

                    const key =
                        movie?.subject_id ||
                        movie?.subjectId ||
                        movie?.slug ||
                        movie?.name ||
                        movie?.title;

                    if (!key) {
                        return false;
                    }

                    if (seen.has(key)) {
                        return false;
                    }

                    seen.add(key);

                    return true;
                }
            );

        renderMovies(
            $("#homeGrid"),
            allMovies.slice(0, 50)
        );

    } catch (error) {

        console.error(
            "HOME ERROR:",
            error
        );

        $("#featuredGrid").innerHTML = `
            <div class="error">
                Backend/API connection failed.
                <br>
                ${escapeHTML(error.message)}
            </div>
        `;
    }
}


// ======================================================
// SEARCH
// ======================================================

async function searchMovies(query) {

    query =
        query.trim();

    if (!query) {
        return;
    }

    $("#homeSection")
        .classList
        .add("hidden");

    $("#searchSection")
        .classList
        .remove("hidden");

    $("#searchHeading")
        .textContent =
        `Search results for "${query}"`;

    $("#searchGrid").innerHTML =
        `<div class="loading">Searching...</div>`;

    try {

        const data =
            await api(
                `/search?q=${encodeURIComponent(query)}`
            );

        console.log(
            "SEARCH API:",
            data
        );

        const movies =
            data?.items || [];

        renderMovies(
            $("#searchGrid"),
            movies
        );

    } catch (error) {

        console.error(
            "SEARCH ERROR:",
            error
        );

        $("#searchGrid").innerHTML = `
            <div class="error">
                Search failed.
                <br>
                ${escapeHTML(error.message)}
            </div>
        `;
    }
}


// ======================================================
// SEARCH EVENTS
// ======================================================

$("#searchButton")
    .addEventListener(
        "click",
        () => {

            searchMovies(
                $("#searchInput").value
            );

        }
    );


$("#searchInput")
    .addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                searchMovies(
                    $("#searchInput").value
                );

            }

        }
    );


// ======================================================
// SUGGESTIONS
// ======================================================

let suggestionTimeout;


$("#searchInput")
    .addEventListener(
        "input",
        () => {

            clearTimeout(
                suggestionTimeout
            );

            const query =
                $("#searchInput")
                    .value
                    .trim();

            if (!query) {

                $("#suggestions")
                    .style
                    .display =
                    "none";

                return;
            }

            suggestionTimeout =
                setTimeout(
                    () =>
                        loadSuggestions(query),
                    300
                );
        }
    );


async function loadSuggestions(query) {

    try {

        const data =
            await api(
                `/search/suggest?q=${encodeURIComponent(query)}`
            );

        const suggestions =
            data?.suggestions || [];

        const box =
            $("#suggestions");

        box.innerHTML = "";

        if (!suggestions.length) {

            box.style.display =
                "none";

            return;
        }

        suggestions
            .slice(0, 8)
            .forEach(item => {

                const div =
                    document.createElement(
                        "div"
                    );

                div.className =
                    "suggestion-item";

                div.textContent =
                    item?.title ||
                    item?.name ||
                    "Untitled";

                div.addEventListener(
                    "click",
                    () => {

                        box.style.display =
                            "none";

                        $("#searchInput")
                            .value =
                            item?.title ||
                            item?.name ||
                            "";

                        if (item?.slug) {

                            openMovie(
                                item.slug,
                                item?.subject_id ||
                                item?.subjectId
                            );

                        }
                    }
                );

                box.appendChild(div);

            });

        box.style.display =
            "block";

    } catch (error) {

        console.error(
            "SUGGESTION ERROR:",
            error
        );

    }
}


// ======================================================
// OPEN MOVIE
// ======================================================

async function openMovie(
    slug,
    subjectId
) {

    $("#detailModal")
        .classList
        .remove("hidden");

    $("#detailTitle")
        .textContent =
        "Loading...";

    $("#detailPoster")
        .src = "";

    $("#detailDescription")
        .textContent = "";

    $("#detailMeta")
        .textContent = "";

    $("#languageSection")
        .innerHTML = "";

    $("#seasonSection")
        .innerHTML = "";

    $("#episodeSection")
        .innerHTML = "";

    $("#qualitySection")
        .innerHTML = "";

    stopCurrentVideo();

    resetPlayer();

    currentMovie =
        null;

    selectedSeason =
        null;

    selectedEpisode =
        null;

    selectedQuality =
        null;

    try {

        const response =
            await api(
                `/detail/${encodeURIComponent(slug)}`
            );

        console.log(
            "DETAIL API:",
            response
        );

        const data =
            response?.data;

        if (!data) {

            throw new Error(
                "Invalid detail response"
            );
        }

        currentMovie = {

            slug: slug,

            subjectId:
                subjectId ||
                data?.subject?.subject_id ||
                data?.subject?.subjectId ||
                data?.subjectId ||
                data?.subject_id ||
                "",

            data: data
        };

        console.log(
            "CURRENT MOVIE:",
            currentMovie
        );

        renderMovieDetails(
            data
        );

    } catch (error) {

        console.error(
            "DETAIL ERROR:",
            error
        );

        $("#detailTitle")
            .textContent =
            "Unable to load movie.";
    }
}


// ======================================================
// DETAILS
// ======================================================

function renderMovieDetails(data) {

    const subject =
        data?.subject || {};

    $("#detailTitle")
        .textContent =
        subject?.title ||
        data?.metadata?.title ||
        "Untitled";

    $("#detailPoster")
        .src =
        subject?.cover?.url ||
        data?.metadata?.cover?.url ||
        "";

    $("#detailDescription")
        .textContent =
        subject?.description ||
        data?.metadata?.description ||
        "No description available.";

    const meta = [];

    if (subject?.releaseDate) {
        meta.push(
            subject.releaseDate
        );
    }

    if (subject?.countryName) {
        meta.push(
            subject.countryName
        );
    }

    if (subject?.genre) {
        meta.push(
            subject.genre
        );
    }

    if (subject?.imdbRatingValue) {
        meta.push(
            `⭐ ${subject.imdbRatingValue}`
        );
    }

    $("#detailMeta")
        .textContent =
        meta.join(" • ");

    renderLanguages(data);

    renderSeasons(data);

    // Movies do not have season/episode buttons.
    // Load their available qualities directly using
    // the stream API's default movie episode values.
    const seasons =
        Array.isArray(
            data?.resource?.seasons
        )
        ? data.resource.seasons
        : [];

    if (!seasons.length) {
        selectedSeason = {
            se: 0,
            season: 0
        };

        selectedEpisode = 0;

        renderQualities(
            selectedSeason,
            selectedEpisode
        );
    }
}


// ======================================================
// LANGUAGES
// ======================================================

function renderLanguages(data) {

    const dubs =
        Array.isArray(data?.dubs)
        ? data.dubs
        : [];

    if (!dubs.length) {
        return;
    }

    $("#languageSection").innerHTML = `

        <div class="selector">

            <div class="selector-title">
                Language / Version
            </div>

            <div
                id="languageButtons"
                class="selector-buttons"
            ></div>

        </div>
    `;

    const container =
        $("#languageButtons");

    dubs.forEach(
        (dub, index) => {

            const button =
                document.createElement(
                    "button"
                );

            button.textContent =
                dub?.lanName ||
                dub?.lanCode ||
                `Version ${index + 1}`;

            button.addEventListener(
                "click",
                () => {

                    container
                        .querySelectorAll(
                            "button"
                        )
                        .forEach(
                            b =>
                                b.classList
                                    .remove(
                                        "active"
                                    )
                        );

                    button.classList
                        .add("active");

                    console.log(
                        "Selected language:",
                        dub
                    );
                }
            );

            container.appendChild(
                button
            );
        }
    );
}


// ======================================================
// SEASONS
// ======================================================

function renderSeasons(data) {

    const seasons =
        Array.isArray(
            data?.resource?.seasons
        )
        ? data.resource.seasons
        : [];

    if (!seasons.length) {
        return;
    }

    $("#seasonSection").innerHTML = `

        <div class="selector">

            <div class="selector-title">
                Seasons
            </div>

            <div
                id="seasonButtons"
                class="selector-buttons"
            ></div>

        </div>
    `;

    const container =
        $("#seasonButtons");

    seasons.forEach(
        (season, index) => {

            const button =
                document.createElement(
                    "button"
                );

            const seasonNumber =
                season?.se ||
                season?.season ||
                index + 1;

            button.textContent =
                `Season ${seasonNumber}`;

            button.addEventListener(
                "click",
                () => {

                    container
                        .querySelectorAll(
                            "button"
                        )
                        .forEach(
                            b =>
                                b.classList
                                    .remove(
                                        "active"
                                    )
                        );

                    button.classList
                        .add("active");

                    selectedSeason =
                        season;

                    selectedEpisode =
                        null;

                    selectedQuality =
                        null;

                    resetPlayer();

                    renderEpisodes(
                        season
                    );
                }
            );

            container.appendChild(
                button
            );

            if (index === 0) {

                button.classList
                    .add("active");

                selectedSeason =
                    season;

                renderEpisodes(
                    season
                );
            }
        }
    );
}


// ======================================================
// EPISODES
// ======================================================

function renderEpisodes(
    season
) {

    const maxEpisode =
        Number(
            season?.maxEp || 0
        );

    $("#episodeSection")
        .innerHTML = "";

    $("#qualitySection")
        .innerHTML = "";

    selectedEpisode =
        null;

    selectedQuality =
        null;

    resetPlayer();

    if (!maxEpisode) {

        $("#episodeSection")
            .innerHTML = `
                <div class="error">
                    No episodes available.
                </div>
            `;

        return;
    }

    $("#episodeSection").innerHTML = `

        <div class="selector">

            <div class="selector-title">
                Episodes
            </div>

            <div
                id="episodeButtons"
                class="selector-buttons"
            ></div>

        </div>
    `;

    const container =
        $("#episodeButtons");

    for (
        let episode = 1;
        episode <= maxEpisode;
        episode++
    ) {

        const button =
            document.createElement(
                "button"
            );

        button.textContent =
            `EP ${episode}`;

        button.addEventListener(
            "click",
            () => {

                container
                    .querySelectorAll(
                        "button"
                    )
                    .forEach(
                        b =>
                            b.classList
                                .remove(
                                    "active"
                                )
                    );

                button.classList
                    .add("active");

                selectedEpisode =
                    episode;

                selectedQuality =
                    null;

                resetPlayer();

                renderQualities(
                    season,
                    episode
                );
            }
        );

        container.appendChild(
            button
        );

        if (episode === 1) {

            button.classList
                .add("active");

            selectedEpisode =
                episode;

            renderQualities(
                season,
                episode
            );
        }
    }
}


// ======================================================
// QUALITY
// ======================================================

async function renderQualities(
    season,
    episode
) {

    $("#qualitySection")
        .innerHTML = `
            <div class="selector">
                <div class="selector-title">
                    Quality
                </div>
                <div class="selector-buttons">
                    <div class="loading">
                        Loading qualities...
                    </div>
                </div>
            </div>
        `;

    const subjectId =
        currentMovie?.subjectId;

    const se =
        Number(
            season?.se ||
            season?.season ||
            1
        );

    const ep =
        Number(
            episode ||
            1
        );

    if (!subjectId) {
        $("#qualitySection")
            .innerHTML = `
                <div class="error">
                    No movie ID available.
                </div>
            `;
        return;
    }

    try {

        /*
         * Movies use the stream endpoint without season/episode
         * parameters. The Rust API already defaults those values
         * for movies. Series keep using their selected season/episode.
         */
        const hasSeasons =
            Array.isArray(
                currentMovie?.data?.resource?.seasons
            ) &&
            currentMovie.data.resource.seasons.length > 0;

        let requestUrl =
            `${API}/api/stream/` +
            `${encodeURIComponent(subjectId)}`;

        if (hasSeasons) {

            const params =
                new URLSearchParams();

            params.set(
                "se",
                String(se)
            );

            params.set(
                "ep",
                String(ep)
            );

            requestUrl +=
                `?${params.toString()}`;
        }

        console.log(
            "QUALITY REQUEST:",
            requestUrl
        );

        const response =
            await fetch(
                requestUrl
            );

        if (!response.ok) {
            throw new Error(
                `Stream API HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        const sources =
            Array.isArray(data?.sources)
            ? data.sources
            : [];

        const qualities =
            [
                ...new Set(
                    sources
                        .map(
                            source =>
                                source?.quality
                        )
                        .filter(
                            quality =>
                                quality !== null &&
                                quality !== undefined &&
                                String(quality).trim() !== ""
                        )
                        .map(
                            quality =>
                                String(quality)
                        )
                )
            ];

        if (!qualities.length) {
            $("#qualitySection")
                .innerHTML = `
                    <div class="error">
                        No video qualities available.
                    </div>
                `;
            return;
        }

        $("#qualitySection").innerHTML = `

            <div class="selector">

                <div class="selector-title">
                    Quality
                </div>

                <div
                    id="qualityButtons"
                    class="selector-buttons"
                ></div>

            </div>
        `;

        const container =
            $("#qualityButtons");

        qualities.forEach(
            (value, index) => {

                const button =
                    document.createElement(
                        "button"
                    );

                button.textContent =
                    value;

                button.addEventListener(
                    "click",
                    async () => {

                        container
                            .querySelectorAll(
                                "button"
                            )
                            .forEach(
                                b =>
                                    b.classList
                                        .remove(
                                            "active"
                                        )
                            );

                        button.classList
                            .add("active");

                        selectedQuality =
                            String(value);

                        await loadStream();
                    }
                );

                container.appendChild(
                    button
                );

                if (index === 0) {
                    button.classList
                        .add("active");

                    selectedQuality =
                        String(value);
                }
            }
        );

    } catch (error) {

        console.error(
            "QUALITY ERROR:",
            error
        );

        $("#qualitySection")
            .innerHTML = `
                <div class="error">
                    Unable to load video qualities.
                </div>
            `;
    }
}


// ======================================================
// LOAD STREAM
// ======================================================

async function loadStream() {

    const subjectId =
        currentMovie?.subjectId;

    const detailPath =
        currentMovie?.slug;

    const season =
        Number(
            selectedSeason?.se ||
            selectedSeason?.season ||
            1
        );

    const episode =
        Number(
            selectedEpisode ||
            1
        );


    if (!subjectId) {

        showPlayerError(
            "Missing subject_id."
        );

        return;
    }


    if (!detailPath) {

        showPlayerError(
            "Missing detail_path."
        );

        return;
    }


    // ----------------------------------------------
    // STOP OLD PLAYER
    // ----------------------------------------------

    stopCurrentVideo();


    // ----------------------------------------------
    // QUERY PARAMETERS
    // ----------------------------------------------

    // Movies do not have seasons/episodes. The Rust API
    // returns movie sources when called with only the ID.
    // Series keep their season/episode parameters.
    const hasSeasons =
        Array.isArray(
            currentMovie?.data?.resource?.seasons
        ) &&
        currentMovie.data.resource.seasons.length > 0;

    let requestUrl =
        `${API}/api/stream/` +
        `${encodeURIComponent(subjectId)}`;

    if (hasSeasons) {

        const params =
            new URLSearchParams();

        params.set(
            "se",
            String(season)
        );

        params.set(
            "ep",
            String(episode)
        );

        requestUrl +=
            `?${params.toString()}`;
    }


    console.log(
        "STREAM REQUEST:",
        requestUrl
    );


    // ----------------------------------------------
    // LOADING
    // ----------------------------------------------

    const externalPlayers = $("#externalPlayers");
    if (externalPlayers) {
        externalPlayers.innerHTML = `
            <div class="external-player-status">
                Getting video source...
            </div>
        `;
    }

    const downloadBox = $("#downloadBox");
    if (downloadBox) {
        downloadBox.innerHTML = "";
    }


    try {

        const response =
            await fetch(
                requestUrl
            );


        console.log(
            "STREAM HTTP STATUS:",
            response.status
        );


        if (!response.ok) {

            const errorText =
                await response.text();

            console.error(
                "STREAM SERVER ERROR:",
                errorText
            );

            throw new Error(
                `Stream API HTTP ${response.status}`
            );
        }


        const contentType =
            response.headers
                .get("content-type") || "";


        console.log(
            "STREAM CONTENT TYPE:",
            contentType
        );


        // ------------------------------------------
        // DIRECT VIDEO
        // ------------------------------------------

        if (
            contentType
                .toLowerCase()
                .startsWith("video/")
        ) {

            playVideoFromApi(
                requestUrl
            );

            return;
        }


        // ------------------------------------------
        // JSON
        // ------------------------------------------

        const data =
            await response.json();


        console.log(
            "STREAM JSON RESPONSE:",
            data
        );


        // VERY IMPORTANT:
        // Print complete response so we can see
        // exactly what the backend returned.

        console.log(
            "STREAM JSON COMPLETE:",
            JSON.stringify(
                data,
                null,
                2
            )
        );


        // ------------------------------------------
        // SELECT SOURCE
        // ------------------------------------------

        const videoSource =
            selectBestSource(
                data,
                selectedQuality
            );


        if (!videoSource) {

            throw new Error(
                "No playable video source was returned."
            );
        }


        console.log(
            "SELECTED VIDEO SOURCE:",
            videoSource
        );


        // ------------------------------------------
        // PLAY
        // ------------------------------------------

        playVideoFromApi(
            videoSource
        );


    } catch (error) {

        console.error(
            "STREAM ERROR:",
            error
        );

        showPlayerError(
            error.message ||
            "Unable to load video."
        );
    }
}


// ======================================================
// SELECT BEST SOURCE
// ======================================================

function selectBestSource(
    data,
    quality
) {

    // ----------------------------------------------
    // SOURCE ARRAY
    // ----------------------------------------------

    let sources =
        data?.sources;


    if (!Array.isArray(sources)) {

        sources =
            data?.data?.sources;
    }


    if (!Array.isArray(sources)) {

        sources = [];
    }


    console.log(
        "AVAILABLE SOURCES:",
        sources
    );


    // ----------------------------------------------
    // QUALITY NORMALIZATION
    // ----------------------------------------------

    const wanted =
        String(
            quality || ""
        )
        .toLowerCase()
        .replace("p", "")
        .trim();


    // ----------------------------------------------
    // SEARCH QUALITY MATCH
    // ----------------------------------------------

    if (wanted) {

        for (
            const source of sources
        ) {

            const sourceText =
                JSON.stringify(
                    source
                )
                .toLowerCase();


            if (
                sourceText.includes(
                    wanted
                )
            ) {

                const url =
                    getUrlFromObject(
                        source
                    );


                if (url) {
                    return url;
                }
            }
        }
    }


    // ----------------------------------------------
    // FIRST PLAYABLE SOURCE
    // ----------------------------------------------

    for (
        const source of sources
    ) {

        const url =
            getUrlFromObject(
                source
            );


        if (url) {

            return url;

        }
    }


    // ----------------------------------------------
    // FALLBACK
    // ----------------------------------------------

    return extractVideoUrl(
        data
    );
}


// ======================================================
// GET URL FROM SOURCE OBJECT
// ======================================================

function getUrlFromObject(
    source
) {

    if (
        typeof source === "string"
    ) {

        if (
            source.startsWith("http://") ||
            source.startsWith("https://")
        ) {

            return source;

        }

        return "";
    }


    if (
        !source ||
        typeof source !== "object"
    ) {

        return "";
    }


    const keys = [

        "proxy_url",
        "proxyUrl",
        "url",
        "video_url",
        "videoUrl",
        "stream_url",
        "streamUrl",
        "file_url",
        "fileUrl",
        "play_url",
        "playUrl",
        "source_url",
        "sourceUrl",
        "src",
        "file"

    ];


    for (
        const key of keys
    ) {

        const value =
            source[key];


        if (
            typeof value === "string" &&
            (
                value.startsWith("http://") ||
                value.startsWith("https://")
            )
        ) {

            return value;
        }
    }


    return "";
}


// ======================================================
// EXTRACT URL FROM ANY JSON
// ======================================================

function extractVideoUrl(
    data
) {

    if (!data) {
        return "";
    }


    const keys = [

        "url",
        "video_url",
        "videoUrl",
        "stream_url",
        "streamUrl",
        "file_url",
        "fileUrl",
        "play_url",
        "playUrl",
        "source_url",
        "sourceUrl",
        "src",
        "file"

    ];


    function search(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";
        }


        if (
            typeof value === "string"
        ) {

            const text =
                value.trim();


            if (
                text.startsWith("http://") ||
                text.startsWith("https://")
            ) {

                return text;
            }


            return "";
        }


        if (
            Array.isArray(value)
        ) {

            for (
                const item of value
            ) {

                const result =
                    search(item);


                if (result) {
                    return result;
                }
            }


            return "";
        }


        if (
            typeof value === "object"
        ) {

            for (
                const key of keys
            ) {

                const candidate =
                    value[key];


                if (
                    typeof candidate === "string" &&
                    (
                        candidate.startsWith(
                            "http://"
                        ) ||
                        candidate.startsWith(
                            "https://"
                        )
                    )
                ) {

                    return candidate;
                }
            }


            for (
                const key of Object.keys(value)
            ) {

                const result =
                    search(
                        value[key]
                    );


                if (result) {
                    return result;
                }
            }
        }


        return "";
    }


    return search(data);
}


// ======================================================
// EXTERNAL PLAYER HELPERS
// ======================================================

function openExternalPlayer(player, videoUrl) {

    if (!videoUrl) {
        showPlayerError("Video URL is empty.");
        return;
    }

    const ua = navigator.userAgent || "";
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const status = () => $("#externalPlayerStatus");

    const names = {
        vlc: "VLC",
        mx: "MX Player",
        next: "Next Player"
    };

    const name = names[player] || "player";

    // Android: explicit Android VIEW intents. Android's intent system can
    // route a network URL to the requested player, and the browser fallback
    // is only used when that app is not installed.
    if (isAndroid) {
        const packages = {
            vlc: "org.videolan.vlc",
            mx: "com.mxtech.videoplayer.ad",
            next: "dev.anilbeesetti.nextplayer"
        };

        const packageName = packages[player];

        if (packageName) {
            try {
                const parsed = new URL(videoUrl);
                const path = `${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`;
                const scheme = parsed.protocol.replace(":", "");

                const intent =
                    `intent://${path}` +
                    `#Intent;scheme=${scheme};action=android.intent.action.VIEW;` +
                    `type=video/*;package=${packageName};` +
                    `S.browser_fallback_url=${encodeURIComponent(videoUrl)};end`;

                if (status()) status().textContent = `Opening ${name}...`;
                window.location.href = intent;
                return;
            } catch (error) {
                console.warn("Android player launch failed:", error);
            }
        }

        // Last Android fallback: let Android show the normal app chooser.
        if (status()) status().textContent = `Opening Android app chooser for ${name}...`;
        try {
            const parsed = new URL(videoUrl);
            const path = `${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`;
            const scheme = parsed.protocol.replace(":", "");
            window.location.href =
                `intent://${path}#Intent;scheme=${scheme};action=android.intent.action.VIEW;type=video/*;end`;
            return;
        } catch (error) {
            console.warn("Generic Android intent failed:", error);
        }
    }

    // iPhone/iPad: VLC for iOS supports network streams. Safari may ask for
    // permission before handing the custom URL to VLC.
    if (player === "vlc" && isIOS) {
        if (status()) status().textContent = "Opening VLC... If asked, tap Open.";
        const callbackUrl =
            `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(videoUrl)}`;
        window.location.href = callbackUrl;
        return;
    }

    // Windows/macOS/Linux desktop: browsers cannot directly execute an
    // installed application. The custom MovieHub protocol is registered by
    // install-vlc-protocol.bat and passes the REAL network URL to VLC.
    if (player === "vlc") {
        if (status()) {
            status().textContent =
                "Opening VLC... If Chrome asks, choose Open MovieHub VLC.";
        }

        const handlerUrl =
            `moviehub-vlc://open?url=${encodeURIComponent(videoUrl)}`;

        try {
            window.location.href = handlerUrl;
        } catch (error) {
            console.warn("VLC protocol launch failed:", error);
            if (status()) {
                status().textContent =
                    "VLC launcher is not registered. Run install-vlc-protocol.bat once.";
            }
        }
        return;
    }

    // MX Player and Next Player are Android apps. On iOS/desktop there is no
    // universal browser API that can force those apps to launch. Give the
    // user a clear fallback instead of downloading the DASH manifest.
    if (status()) {
        if (isIOS) {
            status().textContent =
                `${name} is not available through a universal iPhone web launch. Use Copy stream URL and open it in a compatible player.`;
        } else {
            status().textContent =
                `${name} can be launched directly on Android. On this device, use Copy stream URL and open it in the player.`;
        }
    }
}


function copyStreamUrl(videoUrl) {

    if (!videoUrl) {
        showPlayerError("Video URL is empty.");
        return;
    }

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(videoUrl)
            .then(() => {
                const status = $("#externalPlayerStatus");
                if (status) status.textContent = "Stream URL copied.";
            })
            .catch(() => fallbackCopy(videoUrl));
        return;
    }

    fallbackCopy(videoUrl);
}


function fallbackCopy(videoUrl) {

    const area = document.createElement("textarea");
    area.value = videoUrl;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.focus();
    area.select();

    try {
        document.execCommand("copy");
        const status = $("#externalPlayerStatus");
        if (status) status.textContent = "Stream URL copied.";
    } catch (error) {
        console.warn("Could not copy stream URL:", error);
    }

    area.remove();
}


function renderExternalPlayerButtons(videoUrl) {

    const box = $("#externalPlayers");

    if (!box || !videoUrl) {
        return;
    }

    box.innerHTML = `
        <div class="external-player-title">Play with external player</div>
        <div class="external-player-buttons">
            <button type="button" class="external-player-button" data-player="vlc">▶ VLC</button>
            <button type="button" class="external-player-button" data-player="mx">▶ MX Player</button>
            <button type="button" class="external-player-button" data-player="next">▶ Next Player</button>
            <button type="button" class="external-player-button secondary" id="copyStreamButton">Copy stream URL</button>
        </div>
        <div id="externalPlayerStatus" class="external-player-status">
            The selected quality stream is ready. On Android, the system will try the selected app and otherwise use the stream URL.
        </div>
    `;

    box.querySelectorAll("[data-player]").forEach(button => {
        button.addEventListener("click", () => {
            openExternalPlayer(button.dataset.player, videoUrl);
        });
    });

    $("#copyStreamButton")?.addEventListener("click", () => {
        copyStreamUrl(videoUrl);
    });
}


// ======================================================
// PLAY VIDEO
// ======================================================

function playVideoFromApi(videoUrl) {

    if (!videoUrl) {
        showPlayerError("Video URL is empty.");
        return;
    }

    console.log("EXTERNAL PLAYER ONLY:", videoUrl);

    // The internal browser/DASH player is intentionally disabled.
    // Only external players are rendered for the selected quality.
    renderExternalPlayerButtons(videoUrl);

    // Keep the Download MP4 UI, but never start a backend download.
    const downloadBox = $("#downloadBox");

    if (downloadBox) {
        downloadBox.innerHTML = `
            <button
                id="startDownloadButton"
                class="download-button"
                type="button"
            >
                Download MP4
            </button>
        `;

        const startDownloadButton =
            document.getElementById("startDownloadButton");

        if (startDownloadButton) {
            startDownloadButton.addEventListener(
                "click",
                (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    showDownloadDisabledPopup();
                }
            );
        }
    }

    return;
}


// ======================================================
// DOWNLOAD DISABLED POPUP
// ======================================================

function showDownloadDisabledPopup() {
    let popup = document.getElementById("downloadDisabledPopup");

    if (!popup) {
        popup = document.createElement("div");
        popup.id = "downloadDisabledPopup";
        popup.innerHTML = `
            <div class="download-disabled-popup-content" role="dialog" aria-modal="true">
                <h3>Download currently disabled</h3>
                <p>~Paisa nhi hai service k liye</p>
                <button type="button" id="downloadDisabledClose">OK</button>
            </div>
        `;

        Object.assign(popup.style, {
            position: "fixed",
            inset: "0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: "99999",
            background: "rgba(0,0,0,.65)",
            padding: "20px",
            boxSizing: "border-box"
        });

        const content = popup.querySelector(".download-disabled-popup-content");
        Object.assign(content.style, {
            width: "min(420px, 100%)",
            boxSizing: "border-box",
            background: "#111",
            color: "#fff",
            border: "1px solid rgba(255,255,255,.15)",
            borderRadius: "14px",
            padding: "24px",
            textAlign: "center",
            boxShadow: "0 18px 60px rgba(0,0,0,.45)"
        });

        const button = popup.querySelector("#downloadDisabledClose");
        Object.assign(button.style, {
            border: "0",
            borderRadius: "8px",
            padding: "10px 18px",
            cursor: "pointer",
            font: "inherit"
        });

        button.addEventListener("click", () => popup.remove());
        popup.addEventListener("click", event => {
            if (event.target === popup) popup.remove();
        });
        document.body.appendChild(popup);
    }
}

// ======================================================
// DOWNLOAD MANAGER
// ======================================================

let activeDownloadPoll = null;

function formatDownloadTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "00:00";

    const total = Math.floor(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;

    if (hours > 0) {
        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }

    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function startDownloadManager(subjectId, params, movieName) {
    if (activeDownloadPoll) {
        clearInterval(activeDownloadPoll);
        activeDownloadPoll = null;
    }

    const query =
        params && params.toString()
            ? `?${params.toString()}`
            : "";

    const startUrl =
        `${API}/api/download/start/${encodeURIComponent(subjectId)}` +
        query;

    $("#downloadBox").innerHTML = `
        <div class="download-manager">
            <div class="download-manager-title">Downloading...</div>
            <div class="download-manager-name">
                ${escapeHTML(movieName || "Movie")}
            </div>

            <div class="download-progress-track">
                <div id="downloadProgressBar" class="download-progress-bar"></div>
            </div>

            <div class="download-progress-row">
                <span id="downloadProgressText">Starting...</span>
                <span id="downloadPercent">0%</span>
            </div>

            <div class="download-stats">
                <div class="download-stat">
                    <div class="download-stat-label">Duration</div>
                    <div id="downloadDuration" class="download-stat-value">00:00 / 00:00</div>
                </div>
                <div class="download-stat">
                    <div class="download-stat-label">Speed</div>
                    <div id="downloadSpeed" class="download-stat-value">--</div>
                </div>
                <div class="download-stat">
                    <div class="download-stat-label">Downloaded</div>
                    <div id="downloadSize" class="download-stat-value">--</div>
                </div>
            </div>

            <div id="downloadActions" class="download-actions">
                <button id="downloadCancel" class="download-cancel" type="button">
                    Cancel
                </button>
            </div>
        </div>
    `;

    fetch(startUrl)
        .then(response => {
            if (!response.ok) throw new Error("Could not start download.");
            return response.json();
        })
        .then(data => {
            if (!data.job_id) {
                throw new Error("Download job ID was not returned.");
            }

            pollDownloadStatus(data.job_id);

            const cancelButton = document.getElementById("downloadCancel");

            if (cancelButton) {
                cancelButton.addEventListener("click", async () => {
                    cancelButton.disabled = true;
                    cancelButton.textContent = "Cancelling...";

                    try {
                        const response = await fetch(
                            `${API}/api/download/cancel/${encodeURIComponent(data.job_id)}`,
                            { method: "POST" }
                        );

                        if (!response.ok) {
                            throw new Error("Could not cancel download.");
                        }
                    } catch (error) {
                        cancelButton.disabled = false;
                        cancelButton.textContent = "Cancel";
                        console.error("Download cancellation failed:", error);
                    }
                });
            }
        })
        .catch(error => {
            $("#downloadBox").innerHTML = `
                <div class="download-manager">
                    <div class="download-manager-title">Download error</div>
                    <div class="download-manager-name">${escapeHTML(error.message)}</div>
                </div>
            `;
        });
}

function pollDownloadStatus(jobId) {
    if (activeDownloadPoll) {
        clearInterval(activeDownloadPoll);
    }

    const check = async () => {
        try {
            const response = await fetch(
                `${API}/api/download/status/${encodeURIComponent(jobId)}`
            );

            if (!response.ok) {
                throw new Error("Could not read download status.");
            }

            const data = await response.json();

            const progress = Math.max(
                0,
                Math.min(100, Number(data.progress) || 0)
            );

            const bar = document.getElementById("downloadProgressBar");
            const percent = document.getElementById("downloadPercent");
            const progressText = document.getElementById("downloadProgressText");
            const duration = document.getElementById("downloadDuration");
            const speed = document.getElementById("downloadSpeed");
            const size = document.getElementById("downloadSize");

            if (bar) bar.style.width = `${progress}%`;
            if (percent) percent.textContent = `${progress.toFixed(1)}%`;

            if (progressText) {
                progressText.textContent =
                    data.status === "completed"
                        ? "Completed"
                        : data.status === "error"
                            ? "Download failed"
                            : "Downloading...";
            }

            if (duration) {
                duration.textContent =
                    `${formatDownloadTime(Number(data.downloaded_seconds))} / ` +
                    `${formatDownloadTime(Number(data.total_seconds))}`;
            }

            if (speed) speed.textContent = data.speed || "--";
            if (size) size.textContent = data.size || "--";

            if (data.status === "completed" && data.ready) {
                clearInterval(activeDownloadPoll);
                activeDownloadPoll = null;

                const actions = document.getElementById("downloadActions");

                if (actions) {
                    actions.innerHTML = `
                        <a
                            class="download-save"
                            href="${API}/api/download/file/${encodeURIComponent(jobId)}"
                            download
                            target="_blank"
                            rel="noopener"
                        >
                            Save MP4
                        </a>
                    `;
                }

                return;
            }

            if (data.status === "cancelled") {
                clearInterval(activeDownloadPoll);
                activeDownloadPoll = null;

                if (progressText) {
                    progressText.textContent = "Cancelled";
                }

                const actions = document.getElementById("downloadActions");

                if (actions) {
                    actions.innerHTML = "";
                }

                return;
            }

            if (data.status === "error") {
                clearInterval(activeDownloadPoll);
                activeDownloadPoll = null;

                if (progressText) {
                    progressText.textContent =
                        data.error || "Download failed";
                }
            }
        } catch (error) {
            console.error("DOWNLOAD STATUS ERROR:", error);
        }
    };

    check();
    activeDownloadPoll = setInterval(check, 1000);
}

// PLAYER ERROR
// ======================================================

function showPlayerError(
    message
) {

    const externalPlayers = $("#externalPlayers");

    if (externalPlayers) {
        externalPlayers.innerHTML = `
            <div class="error">
                ${escapeHTML(message)}
            </div>
        `;
    }

    const downloadBox = $("#downloadBox");
    if (downloadBox) {
        downloadBox.innerHTML = "";
    }
}


// ======================================================
// RESET PLAYER
// ======================================================

function resetPlayer() {

    if (window.currentDashPlayer) {
        try {
            window.currentDashPlayer.reset();
        } catch (error) {
            console.warn("Could not reset legacy player:", error);
        }
        window.currentDashPlayer = null;
    }

    if (activeDownloadPoll) {
        clearInterval(activeDownloadPoll);
        activeDownloadPoll = null;
    }

    const downloadBox = $("#downloadBox");
    if (downloadBox) downloadBox.innerHTML = "";

    const externalPlayers = $("#externalPlayers");
    if (externalPlayers) externalPlayers.innerHTML = "";
}


function stopCurrentVideo() {

    if (window.currentDashPlayer) {
        try {
            window.currentDashPlayer.reset();
        } catch (error) {
            console.warn("Could not stop legacy player:", error);
        }
        window.currentDashPlayer = null;
    }

    const video = $("#videoPlayer");
    if (video) {
        try {
            video.pause();
            video.removeAttribute("src");
            video.load();
        } catch (error) {
            console.warn("Could not stop legacy video element:", error);
        }
    }
}


// ======================================================
// CLOSE MODAL
// ======================================================

$("#closeModal")
    .addEventListener(
        "click",
        () => {

            stopCurrentVideo();

            $("#detailModal")
                .classList
                .add("hidden");

            resetPlayer();

        }
    );


// ======================================================
// CLICK OUTSIDE MODAL
// ======================================================

$("#detailModal")
    .addEventListener(
        "click",
        event => {

            if (
                event.target ===
                $("#detailModal")
            ) {

                stopCurrentVideo();

                $("#detailModal")
                    .classList
                    .add("hidden");

                resetPlayer();

            }

        }
    );


// ======================================================
// START
// ======================================================

console.log(
    "MovieHub script loaded."
);

console.log(
    "Backend:",
    API
);


loadHome();
