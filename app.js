/**
 * Tizen TV 6.0 IPTV Streamer & Web Media Portal
 * Integrates iptv-org live channels with Hls.js playback and Spatial Navigation
 */

(function () {
    'use strict';

    // State
    var currentTab = 'iptv';
    var activeCategory = 'movies';
    var focusedElement = null;
    var hls = null;
    var hudTimeout = null;
    var allChannels = [];

    // Verified Fast Starting Streams from iptv-org
    var preloadedChannels = {
        movies: [
            { name: "24H Free Movies", logo: "https://i.imgur.com/iSVnzR1.png", url: "https://d1j2u714xk898n.cloudfront.net/scheduler/scheduleMaster/145.m3u8", group: "Movies" },
            { name: "30A TV Classic Cinema", logo: "https://i.imgur.com/mgXeEE4.png", url: "https://30a-tv.com/feeds/pzaz/30atvmovies.m3u8", group: "Movies" },
            { name: "Public Domain Movies", logo: "https://i.imgur.com/vFOgVbG.png", url: "https://stream.ecable.tv/pdm/tracks-v1a1/mono.m3u8", group: "Movies" },
            { name: "Cinema Retro TV", logo: "https://i.imgur.com/mgXeEE4.png", url: "https://linear-416.frequency.stream/mt/studio/416/hls/master/playlist.m3u8", group: "Movies" }
        ],
        news: [
            { name: "Bloomberg TV Global", logo: "https://i.imgur.com/xTh5u9C.png", url: "https://bloomberg.com/media-manifest/streams/us.m3u8", group: "News" },
            { name: "Euronews English", logo: "https://i.imgur.com/13J01yT.png", url: "https://euronews-euronews-world-1-nl.samsung.wurl.tv/playlist.m3u8", group: "News" },
            { name: "France 24 English", logo: "https://i.imgur.com/5lG2Gvd.png", url: "https://static.france24.com/live/F24_EN_LO_HLS/live_tv.m3u8", group: "News" },
            { name: "Sky News Live", logo: "https://i.imgur.com/Z4c9h54.png", url: "https://skynews.akamaized.net/hls/live/2042858/slot1/index.m3u8", group: "News" },
            { name: "NASA TV Live", logo: "https://i.imgur.com/wP0cR4v.png", url: "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8", group: "News" }
        ],
        sports: [
            { name: "Red Bull TV", logo: "https://i.imgur.com/i6u86bM.png", url: "https://rbmn-live.akamaized.net/hls/live/590964/FL_PIT_US_1/master.m3u8", group: "Sports" },
            { name: "World Poker Tour", logo: "https://i.imgur.com/q2y2n0p.png", url: "https://wpt-wpt-1-us.samsung.wurl.tv/playlist.m3u8", group: "Sports" },
            { name: "Motorvision TV", logo: "https://i.imgur.com/n14a00O.png", url: "https://motorvision-motorvision-1-us.samsung.wurl.tv/playlist.m3u8", group: "Sports" }
        ],
        music: [
            { name: "Stingray Qello Concerts", logo: "https://i.imgur.com/T0bX8Z3.png", url: "https://stingray-qelloconcerts-1-us.samsung.wurl.tv/playlist.m3u8", group: "Music" },
            { name: "Clubbing TV", logo: "https://i.imgur.com/UfH65bF.png", url: "https://stream.ads.ottera.tv/playlist.m3u8?network_id=1460", group: "Music" }
        ],
        animation: [
            { name: "Retro Anime TV", logo: "https://i.imgur.com/W2oE55d.png", url: "https://linear-105.frequency.stream/dist/cinedigm/105/hls/master/playlist.m3u8", group: "Animation" },
            { name: "Kids Classics", logo: "https://i.imgur.com/4e4b51A.png", url: "https://kids-linear.stream.highshelf.tv/master.m3u8", group: "Animation" }
        ],
        documentary: [
            { name: "DocuBay TV", logo: "https://i.imgur.com/G4A5P1z.png", url: "https://docubay-docubay-1-us.samsung.wurl.tv/playlist.m3u8", group: "Documentary" },
            { name: "WildEarth Safari", logo: "https://i.imgur.com/o03X82p.png", url: "https://wildearth-wildearth-1-us.samsung.wurl.tv/playlist.m3u8", group: "Documentary" }
        ]
    };

    // Preloaded Streaming Web Portals & Media Services
    var defaultWebSites = [
        { name: "Pluto TV Web Portal", desc: "100+ Free Live Channels & On-Demand Shows", url: "https://pluto.tv", tag: "TV & Movies" },
        { name: "Plex Free Live & Shows", desc: "Free Movies, Documentaries & Web TV", url: "https://watch.plex.tv", tag: "Movies & Shows" },
        { name: "Internet Archive Feature Films", desc: "Thousands of Public Domain Classics & Vintage Cinema", url: "https://archive.org/details/feature_films", tag: "Cinema Archive" },
        { name: "NASA Live Science Portal", desc: "Live Space Exploration, ISS Cameras & Feeds", url: "https://www.nasa.gov/live/", tag: "Science & Space" },
        { name: "Red Bull TV Live", desc: "Live Action Sports, Documentaries & Racing", url: "https://www.redbull.com/us-en/live-events", tag: "Action Sports" }
    ];

    // DOM Elements
    var tabIptvBtn = document.getElementById('tab-iptv');
    var tabSitesBtn = document.getElementById('tab-sites');
    var iptvSection = document.getElementById('iptv-section');
    var sitesSection = document.getElementById('sites-section');

    var channelsGrid = document.getElementById('channels-grid');
    var sitesGrid = document.getElementById('sites-grid');
    var catButtons = document.querySelectorAll('.cat-btn');

    var playerOverlay = document.getElementById('player-overlay');
    var mainVideo = document.getElementById('main-video');
    var playerHud = document.getElementById('player-hud');
    var playerTitle = document.getElementById('player-title');
    var playerStatus = document.getElementById('player-status');
    var closePlayerBtn = document.getElementById('close-player-btn');
    var playPauseBtn = document.getElementById('play-pause-btn');
    var aspectBtn = document.getElementById('aspect-btn');

    var addSiteBtn = document.getElementById('add-site-btn');

    /**
     * INITIALIZATION
     */
    function init() {
        initTizenRemoteKeys();
        setupNavigationEngine();
        setupTabEvents();
        loadCategory(activeCategory);
        renderWebSites();
        fetchIptvOrgCategoryM3U(activeCategory);

        // Initial Focus
        setTimeout(function () {
            var focusables = getVisibleFocusables();
            if (focusables.length > 0) setFocus(focusables[0]);
        }, 100);
    }

    /**
     * TIZEN TV REMOTE KEYS & HARDWARE REGISTRATION
     */
    function initTizenRemoteKeys() {
        if (window.tizen && window.tizen.tvinputdevice) {
            var keys = [
                'ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue',
                'MediaPlay', 'MediaPause', 'MediaStop', 'MediaPlayPause',
                'MediaFastForward', 'MediaRewind'
            ];
            for (var i = 0; i < keys.length; i++) {
                try {
                    tizen.tvinputdevice.registerKey(keys[i]);
                } catch (e) {}
            }
        }

        // Return / Back hardware key
        window.addEventListener('tizenhwkey', function (e) {
            if (e.keyName === 'back') {
                handleBackKey(e);
            }
        });
    }

    function handleBackKey(e) {
        if (playerOverlay.style.display === 'block') {
            if (e) e.preventDefault();
            closeVideoPlayer();
        } else if (currentTab === 'sites') {
            if (e) e.preventDefault();
            switchTab('iptv');
        } else {
            try {
                if (window.tizen && tizen.application) {
                    tizen.application.getCurrentApplication().exit();
                }
            } catch (err) {}
        }
    }

    /**
     * 2D SPATIAL NAVIGATION ENGINE FOR TV REMOTE
     */
    function setupNavigationEngine() {
        window.addEventListener('keydown', function (e) {
            var keyCode = e.keyCode;

            // Color buttons
            if (keyCode === 403) { // RED -> IPTV Channels
                e.preventDefault();
                switchTab('iptv');
                return;
            }
            if (keyCode === 404) { // GREEN -> Custom Web Sites Portal
                e.preventDefault();
                switchTab('sites');
                return;
            }
            if (keyCode === 405) { // YELLOW -> Cycle Category
                e.preventDefault();
                cycleCategory();
                return;
            }
            if (keyCode === 406) { // BLUE -> Toggle Play / Pause in player
                e.preventDefault();
                togglePlayPause();
                return;
            }

            // Media keys
            if (keyCode === 10252 || keyCode === 415 || keyCode === 19) { // Play/Pause
                e.preventDefault();
                togglePlayPause();
                return;
            }

            // Back key
            if (keyCode === 10009 || keyCode === 27) {
                e.preventDefault();
                handleBackKey(null);
                return;
            }

            // Enter / OK key
            if (keyCode === 13) {
                if (focusedElement) {
                    e.preventDefault();
                    focusedElement.click();
                }
                return;
            }

            // D-Pad Arrows
            var dir = null;
            if (keyCode === 38) dir = 'up';
            else if (keyCode === 40) dir = 'down';
            else if (keyCode === 37) dir = 'left';
            else if (keyCode === 39) dir = 'right';

            if (dir) {
                e.preventDefault();
                moveDirectional(dir);
            }
        });
    }

    function getVisibleFocusables() {
        // If player is active, only player HUD focusables
        if (playerOverlay.style.display === 'block') {
            showPlayerHud();
            return Array.prototype.slice.call(playerOverlay.querySelectorAll('.focusable'));
        }

        var elements = document.querySelectorAll('.focusable');
        var visible = [];
        for (var i = 0; i < elements.length; i++) {
            var el = elements[i];
            if (el.offsetParent !== null && window.getComputedStyle(el).display !== 'none') {
                visible.push(el);
            }
        }
        return visible;
    }

    function setFocus(el) {
        if (!el) return;
        if (focusedElement) {
            focusedElement.classList.remove('tv-focused');
        }
        focusedElement = el;
        focusedElement.classList.add('tv-focused');
        focusedElement.focus();
        try {
            focusedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (e) {}
    }

    function moveDirectional(direction) {
        var focusables = getVisibleFocusables();
        if (focusables.length === 0) return;

        if (!focusedElement || focusables.indexOf(focusedElement) === -1) {
            setFocus(focusables[0]);
            return;
        }

        var curRect = focusedElement.getBoundingClientRect();
        var curCenter = { x: curRect.left + curRect.width / 2, y: curRect.top + curRect.height / 2 };

        var bestCandidate = null;
        var minScore = Infinity;

        for (var i = 0; i < focusables.length; i++) {
            var cand = focusables[i];
            if (cand === focusedElement) continue;

            var candRect = cand.getBoundingClientRect();
            var candCenter = { x: candRect.left + candRect.width / 2, y: candRect.top + candRect.height / 2 };

            var dx = candCenter.x - curCenter.x;
            var dy = candCenter.y - curCenter.y;

            var valid = false;
            var primary = 0;
            var secondary = 0;

            if (direction === 'up' && dy < -5) { valid = true; primary = Math.abs(dy); secondary = Math.abs(dx); }
            else if (direction === 'down' && dy > 5) { valid = true; primary = Math.abs(dy); secondary = Math.abs(dx); }
            else if (direction === 'left' && dx < -5) { valid = true; primary = Math.abs(dx); secondary = Math.abs(dy); }
            else if (direction === 'right' && dx > 5) { valid = true; primary = Math.abs(dx); secondary = Math.abs(dy); }

            if (valid) {
                var score = primary + (secondary * 2.5);
                if (score < minScore) {
                    minScore = score;
                    bestCandidate = cand;
                }
            }
        }

        if (bestCandidate) {
            setFocus(bestCandidate);
        }
    }

    /**
     * TAB & CATEGORY NAVIGATION
     */
    function setupTabEvents() {
        if (tabIptvBtn) tabIptvBtn.addEventListener('click', function () { switchTab('iptv'); });
        if (tabSitesBtn) tabSitesBtn.addEventListener('click', function () { switchTab('sites'); });

        for (var i = 0; i < catButtons.length; i++) {
            (function (btn) {
                btn.addEventListener('click', function () {
                    var cat = btn.getAttribute('data-cat');
                    selectCategory(cat, btn);
                });
            })(catButtons[i]);
        }

        if (closePlayerBtn) closePlayerBtn.addEventListener('click', closeVideoPlayer);
        if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlayPause);
        if (aspectBtn) aspectBtn.addEventListener('click', toggleAspectRatio);
        if (addSiteBtn) addSiteBtn.addEventListener('click', promptAddCustomStream);
    }

    function switchTab(tab) {
        currentTab = tab;
        tabIptvBtn.classList.remove('selected');
        tabSitesBtn.classList.remove('selected');

        if (tab === 'iptv') {
            tabIptvBtn.classList.add('selected');
            iptvSection.style.display = 'block';
            sitesSection.style.display = 'none';
            setFocus(tabIptvBtn);
        } else {
            tabSitesBtn.classList.add('selected');
            iptvSection.style.display = 'none';
            sitesSection.style.display = 'grid';
            setFocus(tabSitesBtn);
        }
    }

    function selectCategory(cat, btn) {
        activeCategory = cat;
        for (var i = 0; i < catButtons.length; i++) {
            catButtons[i].classList.remove('selected');
        }
        if (btn) btn.classList.add('selected');

        loadCategory(cat);
        fetchIptvOrgCategoryM3U(cat);
    }

    function cycleCategory() {
        var categories = ['movies', 'news', 'sports', 'music', 'animation', 'documentary'];
        var idx = categories.indexOf(activeCategory);
        var nextIdx = (idx + 1) % categories.length;
        var nextCat = categories[nextIdx];

        var targetBtn = document.querySelector('.cat-btn[data-cat="' + nextCat + '"]');
        selectCategory(nextCat, targetBtn);
    }

    /**
     * RENDER CHANNELS & IPTV-ORG FETCHING
     */
    function loadCategory(cat) {
        var channels = preloadedChannels[cat] || [];
        renderChannelCards(channels);
    }

    function renderChannelCards(channels) {
        if (!channelsGrid) return;
        channelsGrid.innerHTML = '';

        for (var i = 0; i < channels.length; i++) {
            var ch = channels[i];
            var card = document.createElement('div');
            card.className = 'channel-card focusable';
            card.tabIndex = 0;
            card.setAttribute('data-url', ch.url);
            card.setAttribute('data-name', ch.name);

            var logoHtml = ch.logo
                ? '<img class="channel-logo" src="' + ch.logo + '" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'block\';" />' +
                  '<span class="channel-fallback-icon" style="display:none;">📺</span>'
                : '<span class="channel-fallback-icon">📺</span>';

            card.innerHTML =
                '<div class="channel-logo-container">' + logoHtml + '</div>' +
                '<div class="channel-name">' + ch.name + '</div>' +
                '<span class="channel-tag">' + (ch.group || 'Live TV') + '</span>';

            (function (channel) {
                card.addEventListener('click', function () {
                    playStream(channel.url, channel.name);
                });
            })(ch);

            channelsGrid.appendChild(card);
        }
    }

    function fetchIptvOrgCategoryM3U(cat) {
        var url = 'https://iptv-org.github.io/iptv/categories/' + cat + '.m3u';
        fetch(url)
            .then(function (res) { return res.text(); })
            .then(function (m3uText) {
                var parsed = parseM3U(m3uText, cat);
                if (parsed.length > 0) {
                    // Combine preloaded and parsed, deduplicating by URL
                    var combined = (preloadedChannels[cat] || []).concat(parsed);
                    var seen = {};
                    var deduped = [];
                    for (var i = 0; i < combined.length; i++) {
                        if (!seen[combined[i].url]) {
                            seen[combined[i].url] = true;
                            deduped.push(combined[i]);
                        }
                    }
                    // Limit to top 50 per category for fast TV rendering
                    renderChannelCards(deduped.slice(0, 50));
                }
            })
            .catch(function (err) {
                console.warn('IPTV M3U fetch error (using preloaded):', err);
            });
    }

    function parseM3U(text, groupName) {
        var lines = text.split('\n');
        var channels = [];
        var curName = '';
        var curLogo = '';

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (line.indexOf('#EXTINF:') === 0) {
                // Extract channel name
                var commaIdx = line.lastIndexOf(',');
                if (commaIdx !== -1) {
                    curName = line.substring(commaIdx + 1).trim();
                }
                // Extract logo
                var logoMatch = line.match(/tvg-logo="([^"]+)"/);
                curLogo = logoMatch ? logoMatch[1] : '';
            } else if (line.length > 0 && line.indexOf('#') !== 0 && line.indexOf('http') === 0) {
                if (curName && line.indexOf('.m3u8') !== -1) {
                    channels.push({
                        name: curName,
                        logo: curLogo,
                        url: line,
                        group: groupName.toUpperCase()
                    });
                }
                curName = '';
                curLogo = '';
            }
        }
        return channels;
    }

    /**
     * VIDEO PLAYER & HLS.JS STREAMING ENGINE
     */
    function playStream(url, title) {
        if (!playerOverlay || !mainVideo) return;

        playerOverlay.style.display = 'block';
        if (playerTitle) playerTitle.innerText = title;
        if (playerStatus) playerStatus.innerText = 'Connecting to HLS Live Stream...';

        showPlayerHud();

        // Destroy previous Hls instance
        if (hls) {
            hls.destroy();
            hls = null;
        }

        // Try Hls.js
        if (window.Hls && Hls.isSupported()) {
            hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                manifestLoadingMaxRetry: 3
            });
            hls.loadSource(url);
            hls.attachMedia(mainVideo);

            hls.on(Hls.Events.MANIFEST_PARSED, function () {
                mainVideo.play().catch(function () {});
                if (playerStatus) playerStatus.innerText = 'Streaming Live HLS (Direct)';
            });

            hls.on(Hls.Events.ERROR, function (event, data) {
                if (data.fatal) {
                    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                        if (playerStatus) playerStatus.innerText = 'Network buffering... retrying';
                        hls.startLoad();
                    } else {
                        if (playerStatus) playerStatus.innerText = 'Stream currently offline or blocked by provider';
                    }
                }
            });
        } else if (mainVideo.canPlayType('application/vnd.apple.mpegurl')) {
            // Native Tizen WebKit HLS
            mainVideo.src = url;
            mainVideo.addEventListener('loadedmetadata', function () {
                mainVideo.play().catch(function () {});
                if (playerStatus) playerStatus.innerText = 'Playing Native HLS';
            });
        }

        setFocus(playPauseBtn || closePlayerBtn);
    }

    function togglePlayPause() {
        if (!mainVideo) return;
        if (mainVideo.paused) {
            mainVideo.play();
            if (playPauseBtn) playPauseBtn.innerText = 'Pause';
            if (playerStatus) playerStatus.innerText = 'Playing';
        } else {
            mainVideo.pause();
            if (playPauseBtn) playPauseBtn.innerText = 'Play';
            if (playerStatus) playerStatus.innerText = 'Paused';
        }
        showPlayerHud();
    }

    function toggleAspectRatio() {
        if (!mainVideo) return;
        if (mainVideo.style.objectFit === 'cover') {
            mainVideo.style.objectFit = 'contain';
            if (aspectBtn) aspectBtn.innerText = 'Fit: Contain';
        } else {
            mainVideo.style.objectFit = 'cover';
            if (aspectBtn) aspectBtn.innerText = 'Fit: Fill Screen';
        }
        showPlayerHud();
    }

    function closeVideoPlayer() {
        if (mainVideo) {
            mainVideo.pause();
            mainVideo.removeAttribute('src');
            mainVideo.load();
        }
        if (hls) {
            hls.destroy();
            hls = null;
        }
        if (playerOverlay) {
            playerOverlay.style.display = 'none';
        }
        setFocus(tabIptvBtn);
    }

    function showPlayerHud() {
        if (!playerHud) return;
        playerHud.classList.remove('hidden');
        if (hudTimeout) clearTimeout(hudTimeout);
        hudTimeout = setTimeout(function () {
            playerHud.classList.add('hidden');
        }, 5000);
    }

    /**
     * CUSTOM WEB SITES & STREAM PORTAL
     */
    function renderWebSites() {
        if (!sitesGrid) return;

        var stored = [];
        try {
            var raw = localStorage.getItem('tizen_custom_sites');
            if (raw) stored = JSON.parse(raw);
        } catch (e) {}

        var allSites = defaultWebSites.concat(stored);
        sitesGrid.innerHTML = '';

        for (var i = 0; i < allSites.length; i++) {
            var site = allSites[i];
            var card = document.createElement('div');
            card.className = 'site-card focusable';
            card.tabIndex = 0;

            card.innerHTML =
                '<div>' +
                    '<div class="site-card-title">' + site.name + '</div>' +
                    '<div class="site-card-desc">' + site.desc + '</div>' +
                '</div>' +
                '<div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px;">' +
                    '<span class="channel-tag">' + (site.tag || 'Web Media') + '</span>' +
                    '<span style="font-size:12px; color:#38bdf8; font-weight:700;">Open &rarr;</span>' +
                '</div>';

            (function (s) {
                card.addEventListener('click', function () {
                    openSiteOrStream(s.url, s.name);
                });
            })(site);

            sitesGrid.appendChild(card);
        }
    }

    function openSiteOrStream(url, name) {
        if (url.indexOf('.m3u8') !== -1 || url.indexOf('.mp4') !== -1) {
            playStream(url, name);
        } else {
            // Open external web portal
            window.location.href = url;
        }
    }

    function promptAddCustomStream() {
        var name = prompt('Enter Stream or Site Name (e.g. "My Live Stream"):');
        if (!name) return;
        var url = prompt('Enter Stream URL (m3u8/mp4) or Website URL:');
        if (!url) return;

        var newSite = { name: name, desc: 'Custom Added Web Media', url: url, tag: 'Custom' };
        try {
            var raw = localStorage.getItem('tizen_custom_sites');
            var list = raw ? JSON.parse(raw) : [];
            list.push(newSite);
            localStorage.setItem('tizen_custom_sites', JSON.stringify(list));
            renderWebSites();
            alert('Custom Stream Added!');
        } catch (e) {
            alert('Could not save stream: ' + e);
        }
    }

    // Launch
    window.addEventListener('load', init);
})();
