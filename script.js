// ======================================================
// MOVIEHUB - SCRIPT.JS
// ======================================================

const API = "http://10.149.222.126:8000";

// If backend is running on this laptop instead:
// const API = "http://127.0.0.1:8000";


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

    const slug =
        movie?.slug ||
        movie?.detailPath ||
        "";

    const subjectId =
        movie?.subject_id ||
        movie?.subjectId ||
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
                    "Movie has no slug:",
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
                No movies found.
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

function renderQualities(
    season,
    episode
) {

    $("#qualitySection")
        .innerHTML = "";

    const resolutions =
        Array.isArray(
            season?.resolutions
        )
        ? season.resolutions
        : [];

    if (!resolutions.length) {

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

    resolutions.forEach(
        (resolution, index) => {

            const button =
                document.createElement(
                    "button"
                );

            const value =
                typeof resolution === "object"
                ?
                (
                    resolution?.resolution ||
                    resolution?.name ||
                    resolution?.quality ||
                    `Quality ${index + 1}`
                )
                :
                resolution;

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

                    console.log(
                        "STREAM SELECTION:",
                        {
                            subject_id:
                                currentMovie?.subjectId,

                            detail_path:
                                currentMovie?.slug,

                            se:
                                selectedSeason?.se ||
                                selectedSeason?.season ||
                                1,

                            ep:
                                selectedEpisode ||
                                1,

                            quality:
                                selectedQuality
                        }
                    );

                    await loadStream();
                }
            );

            container.appendChild(
                button
            );
        }
    );
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

    const params =
        new URLSearchParams();

    params.set(
        "detail_path",
        detailPath
    );

    params.set(
        "se",
        String(season)
    );

    params.set(
        "ep",
        String(episode)
    );


    const requestUrl =
        `${API}/api/stream/` +
        `${encodeURIComponent(subjectId)}` +
        `?${params.toString()}`;


    console.log(
        "STREAM REQUEST:",
        requestUrl
    );


    // ----------------------------------------------
    // LOADING
    // ----------------------------------------------

    $("#playerBox").innerHTML = `

        <div class="player-placeholder">

            <div class="big-play">
                ⏳
            </div>

            <h3>
                Loading video...
            </h3>

            <p>
                Getting video source...
            </p>

        </div>
    `;

    $("#downloadBox")
        .innerHTML = "";


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
// PLAY VIDEO
// ======================================================

function playVideoFromApi(
    videoUrl
) {

    if (!videoUrl) {

        showPlayerError(
            "Video URL is empty."
        );

        return;
    }


    console.log(
        "PLAY VIDEO:",
        videoUrl
    );


    const lowerUrl =
        videoUrl.toLowerCase();


    const isHLS =
        lowerUrl.includes(
            ".m3u8"
        );


    const isMP4 =
        lowerUrl.includes(
            ".mp4"
        );


    console.log(
        "MEDIA TYPE:",
        isHLS
            ? "HLS"
            : isMP4
                ? "MP4"
                : "UNKNOWN"
    );


    // ----------------------------------------------
    // CREATE PLAYER
    // ----------------------------------------------

    $("#playerBox").innerHTML = `

        <video
            id="videoPlayer"
            controls
            playsinline
            preload="auto"
            crossorigin="anonymous"
            style="
                width:100%;
                max-width:100%;
                display:block;
                background:#000;
            "
        >
            Your browser does not support video.
        </video>

        <div
            id="videoStatus"
            style="
                padding:8px;
                font-size:13px;
            "
        >
            Loading media...
        </div>

    `;


    const video =
        $("#videoPlayer");


    const status =
        $("#videoStatus");


    // ----------------------------------------------
    // VIDEO EVENTS
    // ----------------------------------------------

    video.addEventListener(
        "loadstart",
        () => {

            status.textContent =
                "Loading media...";

        }
    );


    video.addEventListener(
        "loadedmetadata",
        () => {

            console.log(
                "VIDEO METADATA LOADED:",
                {
                    duration:
                        video.duration,

                    width:
                        video.videoWidth,

                    height:
                        video.videoHeight
                }
            );


            status.textContent =
                `Ready • ${Math.round(video.duration || 0)} sec`;

        }
    );


    video.addEventListener(
        "canplay",
        () => {

            console.log(
                "VIDEO CAN PLAY"
            );


            status.textContent =
                "Ready to play.";


            // Try autoplay only after media
            // is actually ready.

            video.play()
                .catch(
                    error => {

                        console.log(
                            "Autoplay blocked:",
                            error
                        );

                        status.textContent =
                            "Ready — press Play.";

                    }
                );
        }
    );


    video.addEventListener(
        "playing",
        () => {

            status.textContent =
                "Playing";

        }
    );


    video.addEventListener(
        "waiting",
        () => {

            status.textContent =
                "Buffering...";

        }
    );


    video.addEventListener(
        "stalled",
        () => {

            status.textContent =
                "Media stalled.";

            console.warn(
                "VIDEO STALLED"
            );

        }
    );


    video.addEventListener(
        "error",
        () => {

            const error =
                video.error;


            console.error(
                "VIDEO ERROR:",
                error
            );


            let message =
                "Browser could not play this video.";


            if (error) {

                switch (
                    error.code
                ) {

                    case 1:

                        message =
                            "Video loading was aborted.";

                        break;


                    case 2:

                        message =
                            "Network error while loading video.";

                        break;


                    case 3:

                        message =
                            "Video decoding error. The format or codec may not be supported.";

                        break;


                    case 4:

                        message =
                            "Video format/source is not supported.";

                        break;

                }
            }


            status.textContent =
                message;


            console.error(
                "VIDEO ERROR MESSAGE:",
                message
            );

        }
    );


    // ----------------------------------------------
    // SET SOURCE
    // ----------------------------------------------

    video.src =
        videoUrl;


    video.load();


    // ----------------------------------------------
    // DOWNLOAD
    // ----------------------------------------------

    $("#downloadBox").innerHTML = `

        <a
            class="download-button"
            href="${escapeHTML(videoUrl)}"
            download
            target="_blank"
            rel="noopener"
        >
            Download
        </a>

    `;

}


// ======================================================
// PLAYER ERROR
// ======================================================

function showPlayerError(
    message
) {

    $("#playerBox").innerHTML = `

        <div class="error">

            ${escapeHTML(message)}

        </div>

    `;


    $("#downloadBox")
        .innerHTML = "";
}


// ======================================================
// RESET PLAYER
// ======================================================

function resetPlayer() {

    stopCurrentVideo();


    $("#playerBox").innerHTML = `

        <div class="player-placeholder">

            <div class="big-play">
                ▶
            </div>

            <h3>
                Select an authorized video source
            </h3>

            <p>
                The video player will load the
                authorized URL here.
            </p>

        </div>
    `;


    $("#downloadBox")
        .innerHTML = "";
}


// ======================================================
// STOP PLAYER
// ======================================================

function stopCurrentVideo() {

    const video =
        $("#videoPlayer");


    if (!video) {
        return;
    }


    try {

        video.pause();

        video.removeAttribute(
            "src"
        );

        video.load();

    } catch (error) {

        console.error(
            "STOP VIDEO ERROR:",
            error
        );

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