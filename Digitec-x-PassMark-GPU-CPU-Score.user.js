// ==UserScript==
// @name        Digitec x PassMark GPU/CPU Score
// @namespace   https://github.com/berchierm
// @match       https://www.digitec.ch/*
// @require     https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js
// @require     https://unpkg.com/@popperjs/core@2
// @require     https://unpkg.com/tippy.js@6
// @require     https://unpkg.com/micromodal/dist/micromodal.min.js
// @resource    tippyAnimShiftAway https://unpkg.com/tippy.js@6/animations/shift-away.css
// @grant       GM_xmlhttpRequest
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_listValues
// @grant       GM_deleteValue
// @grant       GM_getResourceText
// @grant       GM_addStyle
// @version     1.0
// @author      -
// @description 28/01/2022, 21:20:00
// @downloadURL https://github.com/berchierm/Digitec-x-PassMark-GPU-CPU-Score/raw/master/Digitec-x-PassMark-GPU-CPU-Score.user.js
// ==/UserScript==

const LOG_ENABLED = false;
const LOG_FORCE_TRACE = false;

log("script start");

const SCRIPT_VERSION = GM_info.script.version;
const CACHE_VERSION_KEY = "cacheVersion";
const CACHE_VERSION = GM_getValue(CACHE_VERSION_KEY, 0);
const CACHE_VALIDITY_MS = 24 * 60 * 60 * 1000;

const OBSERVE_ROOT = "#pageContent";
const GPU_CAT_NAMES = ["Cartes graphiques", "Graphics cards", "Grafikkarte", "Schede grafiche"];
const CPU_CAT_NAMES = ["Processeurs", "Processors", "Prozessor", "Processori"];

const CSS_PREFIX = "digiScore_";
const COLOR_COLD = [255, 208, 208];
const COLOR_HOT = [205, 0, 17];
const CLASS_SCORE_BOX_CREATED = CSS_PREFIX + "scoreBoxCreated";
const IDCLASS_NAMES = {
    id_loadIndicator: CSS_PREFIX + "scoreBoxLoadIndicator",
    cl_emptyLabelContainer: CSS_PREFIX + "emptyLabelContainer",
    cl_emptyLabelsWrapper: CSS_PREFIX + "emptyLabelsWrapper",
    cl_scoreBox: CSS_PREFIX + "scoreBox",
    cl_scoreBoxNoLink: CSS_PREFIX + "scoreBoxNolink",
    cl_scoreBoxWarn: CSS_PREFIX + "scoreBoxWarn",
    cl_modal: CSS_PREFIX + "modal",
    cl_modalOverlay: CSS_PREFIX + "modalOverlay",
    cl_modalContainer: CSS_PREFIX + "modalContainer",
    cl_modalHeader: CSS_PREFIX + "modalHeader",
    cl_modalTitle: CSS_PREFIX + "modalTitle",
    cl_modalClose: CSS_PREFIX + "modalClose",
    cl_modalContent: CSS_PREFIX + "modalContent",
    cl_modalItemsList: CSS_PREFIX + "modalItemsList",
    cl_modalItemContainer: CSS_PREFIX + "modalItemContainer",
    cl_modalItemName: CSS_PREFIX + "modalItemName",
    cl_modalItemScore: CSS_PREFIX + "modalItemScore",
};
const CSS_DIGISCORE = `
    #${IDCLASS_NAMES.id_loadIndicator}{
        position: fixed;
        top: 0px;
        right: 0px;
        width: 32px;
        height: 32px;
        z-index: 999;
        background-color: #00559D;
        padding: 4px;
    }
    .${IDCLASS_NAMES.cl_emptyLabelContainer}{
        display: flex;
        flex-wrap: wrap;
        margin: 2px 0 0 -4px;
        min-height: 25px;
    }
    .${IDCLASS_NAMES.cl_emptyLabelsWrapper}{
        width: 100%;
        min-height: 27px;
    }
    .${IDCLASS_NAMES.cl_scoreBox}{
        color: white;
        display: inline-block;
        margin: 4px;
        border-style: solid;
        border-width: 1px;
        font-size: var(--theme-small-font-size);
        font-weight: var(--theme-font-weight-bold);
        line-height: 1;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        z-index: 4;
    }
    .${IDCLASS_NAMES.cl_scoreBoxNoLink}{
        padding: 4px 8px;
    }
    .${IDCLASS_NAMES.cl_scoreBox} a{
        padding: 4px 8px;
        display: block;
        text-decoration: none;
        color: white;
    }
    .${IDCLASS_NAMES.cl_scoreBoxWarn}{
        width: 20px;
        z-index: 4;
    }
`;
const CSS_MODAL = `
    .${IDCLASS_NAMES.cl_modal}{display: none;}
    .${IDCLASS_NAMES.cl_modal}.is-open{display: block;}
    .${IDCLASS_NAMES.cl_modalOverlay}{
        background: rgba(0, 0, 0, 60%);
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        display: flex; justify-content: center; align-items: center;
        z-index: 10000;
    }
    .${IDCLASS_NAMES.cl_modalContainer}{
        background-color: #00559d;
        max-width: 1000px; max-height: 100vh;
        overflow-y: auto;
        box-sizing: border-box;
        color: white;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 0 0 5px rgb(255, 255, 255, 30%);
    }
    .${IDCLASS_NAMES.cl_modalHeader}{
        display: flex; justify-content: space-between; align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid rgb(255, 255, 255, 50%);
    }
    .${IDCLASS_NAMES.cl_modalTitle}{
        margin-top: 0; margin-bottom: 0;
        font-size: inherit; font-weight: inherit;
        box-sizing: border-box;
    }
    .${IDCLASS_NAMES.cl_modalClose}{
        background: transparent;
        border: 0;
        padding: 0px 0px 0px 12px;
        font-weight: 800;
    }
    .${IDCLASS_NAMES.cl_modalHeader} .${IDCLASS_NAMES.cl_modalClose}:before{content: "\u2715";}
    .${IDCLASS_NAMES.cl_modalContent}{
        padding: 12px 16px;
        max-height: 70vh;
        overflow-y: auto;
    }
    .${IDCLASS_NAMES.cl_modalContent} a{color: white;}
    .${IDCLASS_NAMES.cl_modalContent} .${IDCLASS_NAMES.cl_modalItemsList}{
        column-count: 1;
        width: 300px;
        column-gap: 30px;
        column-rule-width: 2px;
        column-rule-style: solid;
        column-rule-color: rgb(255, 255, 255, 50%);
    }
    .${IDCLASS_NAMES.cl_modalContent} .${IDCLASS_NAMES.cl_modalItemsList}.col1{column-count: 1;width: 300px;}
    .${IDCLASS_NAMES.cl_modalContent} .${IDCLASS_NAMES.cl_modalItemsList}.col2{column-count: 2;width: 600px;}
    .${IDCLASS_NAMES.cl_modalContent} .${IDCLASS_NAMES.cl_modalItemsList}.col3{column-count: 3;width: 900px;}
    .${IDCLASS_NAMES.cl_modalContent} .${IDCLASS_NAMES.cl_modalItemContainer}{display: inline-flex;align-items: center;width: 100%;padding: 1px 0px;}
    .${IDCLASS_NAMES.cl_modalContent} .${IDCLASS_NAMES.cl_modalItemContainer}:hover{background-color: rgba(255, 255, 255, 20%);}
    .${IDCLASS_NAMES.cl_modalContent} .${IDCLASS_NAMES.cl_modalItemName}{flex-grow: 1;}
    .${IDCLASS_NAMES.cl_modalContent} .${IDCLASS_NAMES.cl_modalItemScore}{padding-left: 10px;}
    .${IDCLASS_NAMES.cl_modalContent}::-webkit-scrollbar{width: 8px;}
    .${IDCLASS_NAMES.cl_modalContent}::-webkit-scrollbar-track{background: transparent;}
    .${IDCLASS_NAMES.cl_modalContent}::-webkit-scrollbar-thumb{background: rgb(255, 255, 255, 50%);}
    .${IDCLASS_NAMES.cl_modalContent}::-webkit-scrollbar-thumb:hover{background: rgb(255, 255, 255, 80%);}
`;
const CSS_TIPPY_THEME_DIGITEC = `
    .tippy-box[data-theme~='digitec']{
        background-color: #00559d;
        border-radius: 0;
        border: 1px solid #00559d;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 0 0 5px white;
    }
    .tippy-box[data-theme~='digitec'][data-placement^='top'] > .tippy-arrow::before {border-top-color: #00559d;}
    .tippy-box[data-theme~='digitec'][data-placement^='bottom'] > .tippy-arrow::before {border-bottom-color: #00559d;}
    .tippy-box[data-theme~='digitec'][data-placement^='left'] > .tippy-arrow::before {border-left-color: #00559d;}
    .tippy-box[data-theme~='digitec'][data-placement^='right'] > .tippy-arrow::before {border-right-color: #00559d;}
    .tippy-box[data-theme~='digitec'] > .tippy-content .tippyTitle {margin-bottom: 8px;}
    .tippy-box[data-theme~='digitec'] > .tippy-content table {margin-top: 8px;}
    .tippy-box[data-theme~='digitec'] > .tippy-content table .positive {color: #0ee40e;}
    .tippy-box[data-theme~='digitec'] > .tippy-content table .negative {color: #fb6060;}
    .tippy-box[data-theme~='digitec'] > .tippy-content table .right {text-align: right;}
    .tippy-box[data-theme~='digitec'] > .tippy-content tr.tippyHighlight:hover {background-color: rgba(255, 255, 255, 20%);}
    .tippy-box[data-theme~='digitec'] > .tippy-content td {padding: 1px 3px;}
    .tippy-box[data-theme~='digitec'] > .tippy-content td:first-child {padding-left: 0px;}
    .tippy-box[data-theme~='digitec'] > .tippy-content td:last-child {padding-right: 0px;}
    .tippy-box[data-theme~='digitec'] > .tippy-content td a {color: white;}
    .tippy-box[data-theme~='digitec'] > .tippy-content .seeMoreModal {margin-top: 5px;text-decoration: underline;cursor: pointer;text-align:right;}
`;
const CSS_RES = ["tippyAnimShiftAway"];
const CSS_INLINE = [CSS_DIGISCORE, CSS_MODAL, CSS_TIPPY_THEME_DIGITEC];

let pageRoot = null;
let database = {
    gpu: {
        name: "gpu",
        scoreKey: "g3d",
        useTopScoresPercent: true,
        topScoresPercent: 0.03,
        useBrandNameForSearch: false,
        data: null,
        q1: "https://www.videocardbenchmark.net/GPU_mega_page.html",
        q2: "https://www.videocardbenchmark.net/data/?_=" + (new Date().getTime()),
        lookupHrefBase: "https://www.videocardbenchmark.net/video_lookup.php?gpu=",
        storeDb: "cacheGPU",
        storeDbTimestamp: "cacheGPUTimestamp",
        promise: null,
    },
    cpu: {
        name: "cpu",
        scoreKey: "cpumark",
        useTopScoresPercent: true,
        topScoresPercent: 0.03,
        useBrandNameForSearch: true,
        data: null,
        q1: "https://www.cpubenchmark.net/CPU_mega_page.html",
        q2: "https://www.cpubenchmark.net/data/?_=" + (new Date().getTime()),
        lookupHrefBase: "https://www.cpubenchmark.net/cpu_lookup.php?cpu=",
        storeDb: "cacheCPU",
        storeDbTimestamp: "cacheCPUTimestamp",
        promise: null,
    }
};
let scoreCompare = {
    gpu: [
        {
            name: "GeForce GTX 960",
            score: 6046
        },
        {
            name: "GeForce RTX 2060",
            score: 13885
        },
        {
            name: "GeForce RTX 2070 SUPER",
            score: 18148
        }
    ],
    cpu: [
        {
            name: "Intel Core i7-7700K",
            score: 9692
        },
        {
            name: "AMD Ryzen 7 3700X",
            score: 22758
        }
    ]
};



function checkStoredDataVersion() {
    if (SCRIPT_VERSION !== CACHE_VERSION) {
        let storeKeys = GM_listValues()
        log("version changed, clear local data", "warn");
        log(storeKeys, "warn", true)
        storeKeys.filter(key => key !== CACHE_VERSION_KEY).forEach(key => {
            GM_deleteValue(key);
        });
        GM_setValue(CACHE_VERSION_KEY, SCRIPT_VERSION);
    }
}

function injectCss() {
    CSS_RES.forEach(css => {
        GM_addStyle(GM_getResourceText(css));
    });
    CSS_INLINE.forEach(css => {
        GM_addStyle(css);
    });
}

function analyseArticles() {
    let articles = pageRoot.querySelectorAll("article.panelProduct");
    articles.forEach(article => {
        let processed = isArticleScored(article);
        if (!processed) {
            let isLoaded = article.querySelector("[class^='panelLayout']") !== null;
            if (isLoaded) {
                let productCat = article.querySelector("[class^='productHeader'] a").text;
                let productBrand = article.querySelector("[class^='panelLayout_container'] > :not([class^='panelLayout']):not([class^='salesInformationView']) > strong").textContent;
                let productName = article.querySelector("[class^='panelLayout_container'] > :not([class^='panelLayout']) > span").textContent;
                if (inArray(GPU_CAT_NAMES, productCat)) {
                    processArticle(database.gpu, article, productBrand, productName);
                }
                else if (inArray(CPU_CAT_NAMES, productCat)) {
                    processArticle(database.cpu, article, productBrand, productName);
                }
                else {
                    log("not a cpu/gpu", "debug", true);
                }
            }
        }
    });
}

function observeArticles() {
    const targetNode = pageRoot;
    const config = { attributes: true, childList: true, subtree: true };
    const debouncedCallback = _.debounce(analyseArticles, 500, { maxWait: 500 });
    const observer = new MutationObserver(debouncedCallback);
    log("try targetNode:", "debug");
    log(targetNode, "debug", true);
    observer.observe(targetNode, config);
}

function processArticle(db, articleDom, articleBrand, articleName) {
    if (db.data === null || db.data === undefined) {
        if (db.promise === null) {
            db.promise = new Promise((resolve, reject) => {
                log("Init load db");
                loadDatabase(db)
                    .then(() => { resolve(); })
                    .catch((error) => { reject(error) });
            });
            chainPromise(db.promise, db, articleDom, articleBrand, articleName);
        }
        else {
            chainPromise(db.promise, db, articleDom, articleBrand, articleName);
        }
    }
    else {
        scoreArticle(db, articleDom, articleBrand, articleName);
    }
}

function chainPromise(promise, db, articleDom, articleBrand, articleName) {
    promise
        .then(() => {
            scoreArticle(db, articleDom, articleBrand, articleName);
        })
        .catch(() => {
            db.promise = null;
        });
}

function scoreArticle(db, articleDom, articleBrand, articleName) {
    log(articleName, "debug");
    log(articleDom, "debug", true);
    if (!isArticleScored(articleDom)) {
        if (db.useBrandNameForSearch) {
            articleName = articleBrand + " " + articleName;
        }
        let bestMatches = findLeafs(db.data, articleName);
        log(bestMatches, "debug", true);
        let scoreContainer = articleDom.querySelector("[class^='productLabels_labelContainer']");
        if (scoreContainer === null) {
            let containerLabelsWrapper = articleDom.querySelector("[class^='panelLayout_productLabelsWrapper']");
            if (containerLabelsWrapper === null) {
                containerLabelsWrapper = document.createElement("div");
                containerLabelsWrapper.classList.add(IDCLASS_NAMES.cl_emptyLabelsWrapper);
                let priceWrapper = articleDom.querySelector("[class^='panelLayout_priceEnergyWrapper']")
                priceWrapper.parentNode.insertBefore(containerLabelsWrapper, priceWrapper);
            }
            scoreContainer = document.createElement("div");
            scoreContainer.classList.add(IDCLASS_NAMES.cl_emptyLabelContainer);
            containerLabelsWrapper.append(scoreContainer);
        }
        appendDivScore(db, scoreContainer, bestMatches, articleName);
    }
}

function isArticleScored(article) {
    return article.querySelector("div." + CLASS_SCORE_BOX_CREATED) !== null;
}

function findLeafs(baseBranch, searchString) {
    let leafs = [];
    let searchTokens = tokenize(searchString);
    let branches = findBranches(baseBranch, searchTokens);
    let bestBranches = Object.entries(branches.completeMatches).length > 0 ? branches.completeMatches : branches.partialMatches;
    let bestBranchesKeys = Object.keys(bestBranches);
    if (bestBranchesKeys.length > 0) {
        let maxDepth = bestBranchesKeys.reduce((a, b) => a > b ? a : b);
        leafs = flattenBranches(bestBranches[maxDepth]);
    }
    return leafs;
}

function findBranches(baseBranch, searchTokens, depth = 0) {
    let complete = {}, partial = {};
    let dataKeys = Object.keys(baseBranch).filter(k => searchTokens.includes(k));
    dataKeys.forEach(key => {
        let node = baseBranch[key];
        let isLeaf = node.tree_isLeaf !== undefined && node.tree_isLeaf;
        if (isLeaf) {
            (complete[depth] = complete[depth] || []).push(node);
        }
        else {
            (partial[depth] = partial[depth] || []).push(node);
        }
        let subBranchesLeafs = findBranches(node, searchTokens, depth + 1);
        Object.assign(complete, subBranchesLeafs.completeMatches);
        Object.assign(partial, subBranchesLeafs.partialMatches);
    })
    return { completeMatches: complete, partialMatches: partial };
}

function flattenBranches(branches) {
    let flatBranches = [];
    Object.keys(branches).forEach(key => {
        let node = branches[key];
        let isLeaf = node.tree_isLeaf !== undefined && node.tree_isLeaf;
        if (isLeaf) {
            flatBranches.push(node.tree_leafData);
        }
        else {
            flatBranches = flatBranches.concat(flattenBranches(node));
        }
    })
    return flatBranches;
}

function loadDatabase(db) {
    let dbLoadedPromise = new Promise((resolve, reject) => {
        log("encountered a scored item, load list " + db.name);
        let dbAge = GM_getValue(db.storeDbTimestamp);
        let now = (new Date().getTime());
        if ((dbAge + CACHE_VALIDITY_MS) > now) {
            log(db.name + " db cache is still valid");
            let dbData = GM_getValue(db.storeDb);
            updateCompareScores(dbData, db.name);
            db.data = dbData;
            resolve();
        }
        else {
            log(db.name + " db cache invalid -> download");
            downloadDatabase(db)
                .then(() => { resolve(); })
                .catch((error) => { reject(error); });
        }
    });
    return dbLoadedPromise;
}

function downloadDatabase(db) {
    let xmlhttpPromise = new Promise((resolve, reject) => {
        setLoadIndicatorState(true);
        let requestSession = GM_xmlhttpRequest({
            method: "GET",
            url: db.q1,
            onload: (responseSession) => {
                let requestData = GM_xmlhttpRequest({
                    method: "GET",
                    url: db.q2,
                    headers: {
                        "X-Requested-With": "XMLHttpRequest",
                        "Accept": "application/json, text/javascript"
                    },
                    responseType: 'json',
                    onload: (responseData) => {
                        let rawData = JSON.parse(responseData.responseText).data;
                        processDatabase(db, rawData);
                        setLoadIndicatorState(false);
                        resolve();
                    },
                    onerror: (responseSession) => {
                        reject(responseSession);
                    }
                });
            },
            onerror: (responseSession) => {
                reject(responseSession);
            }
        });
    });
    return xmlhttpPromise;
}

function setLoadIndicatorState(state) {
    let loadIndicator = document.querySelector("#" + IDCLASS_NAMES.id_loadIndicator);
    if (state) {
        if (loadIndicator === null) {
            let loadIndicator = document.createElement("div");
            loadIndicator.id = IDCLASS_NAMES.id_loadIndicator;
            let svgCode = "<svg xmlns:svg='http://www.w3.org/2000/svg' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' version='1.0' width='24px' height='24px' viewBox='0 0 128 128' xml:space='preserve'><g><path d='M59.6 0h8v40h-8V0z' fill='#ffffff' fill-opacity='1'/><path d='M59.6 0h8v40h-8V0z' fill='#ffffff' fill-opacity='0.2' transform='rotate(30 64 64)'/><path d='M59.6 0h8v40h-8V0z' fill='#ffffff' fill-opacity='0.2' transform='rotate(60 64 64)'/><path d='M59.6 0h8v40h-8V0z' fill='#ffffff' fill-opacity='0.2' transform='rotate(90 64 64)'/><path d='M59.6 0h8v40h-8V0z' fill='#ffffff' fill-opacity='0.2' transform='rotate(120 64 64)'/><path d='M59.6 0h8v40h-8V0z' fill='#ffffff' fill-opacity='0.3' transform='rotate(150 64 64)'/><path d='M59.6 0h8v40h-8V0z' fill='#ffffff' fill-opacity='0.4' transform='rotate(180 64 64)'/><path d='M59.6 0h8v40h-8V0z' fill='#ffffff' fill-opacity='0.5' transform='rotate(210 64 64)'/><path d='M59.6 0h8v40h-8V0z' fill='#ffffff' fill-opacity='0.6' transform='rotate(240 64 64)'/><path d='M59.6 0h8v40h-8V0z' fill='#ffffff' fill-opacity='0.7' transform='rotate(270 64 64)'/><path d='M59.6 0h8v40h-8V0z' fill='#ffffff' fill-opacity='0.8' transform='rotate(300 64 64)'/><path d='M59.6 0h8v40h-8V0z' fill='#ffffff' fill-opacity='0.9' transform='rotate(330 64 64)'/><animateTransform attributeName='transform' type='rotate' values='0 64 64;30 64 64;60 64 64;90 64 64;120 64 64;150 64 64;180 64 64;210 64 64;240 64 64;270 64 64;300 64 64;330 64 64' calcMode='discrete' dur='1080ms' repeatCount='indefinite'></animateTransform></g></svg>";
            loadIndicator.innerHTML = svgCode;
            document.querySelector("body").append(loadIndicator);
        }
        loadIndicator.style.display = "";
    }
    else {
        if (loadIndicator !== null) {
            loadIndicator.style.display = "none";
        }
    }
}

function processDatabase(db, rawData) {
    rawData.forEach(item => {
        item["score_int"] = parseInt(item[db.scoreKey].replace(/[^-\d]/gi, ""));
    });
    let maxScore = rawData.reduce((a, b) => a.score_int > b.score_int ? a : b);
    let topScores = rawData.sort((a, b) => a.score_int - b.score_int).slice(- Math.max(1, Math.floor(rawData.length * db.topScoresPercent)));
    let avgTopScore = Math.round(topScores.reduce((a, b) => (a + b.score_int), 0) / topScores.length);
    rawData.forEach(item => {
        item["percent_best"] = item.score_int / maxScore.score_int;
        item["percent_avgtop"] = item.score_int / avgTopScore;
    });
    let arrangedData = rearrangeData(rawData);
    GM_setValue(db.storeDb, arrangedData);
    GM_setValue(db.storeDbTimestamp, (new Date().getTime()));
    updateCompareScores(arrangedData, db.name);
    db.data = arrangedData;
    log(arrangedData, "info", true)
}

function rearrangeData(data) {
    let tree = {};
    data.forEach(item => {
        let tokens = tokenize(item.name);
        if (tokens.length > 0) {
            buildTree(tree, tokens[0], tokens.slice(1), item)
        }
    });
    return tree;
}

function buildTree(tree, currentNode, childrenNodes, data) {
    tree[currentNode] = tree[currentNode] || {};
    if (childrenNodes.length === 0) {
        tree[currentNode]["tree_isLeaf"] = true;
        tree[currentNode]["tree_leafData"] = data;
    }
    else {
        buildTree(tree[currentNode], childrenNodes[0], childrenNodes.slice(1), data);
    }
}

function tokenize(str) {
    let cleanStr = str.toLowerCase();
    cleanStr = cleanStr.replace(/((\D{2,})(\d\S*))/, "$1 $2 $3");
    cleanStr = cleanStr.replace(/(\S)(V\d)/, "$1 $2");
    let tokens = cleanStr.split(/\W/).filter(t => t !== "");
    return tokens;
}

function updateCompareScores(dbData, dbName) {
    if (scoreCompare[dbName] !== undefined && scoreCompare[dbName] !== null && scoreCompare[dbName].length >= 1) {
        scoreCompare[dbName].forEach(itemCompare => {
            log("try to find score for compare item : " + itemCompare.name);
            let bestMatches = findLeafs(dbData, itemCompare.name);
            if (bestMatches !== undefined && bestMatches !== null && bestMatches.length === 1) {
                log("an exact match has been found : \"" + itemCompare.name + "\" == \"" + bestMatches[0].name + "\"");
                itemCompare.score = bestMatches[0].score_int;
            }
            else {
                log("exact match not found, keep default score", "error");
                log(bestMatches, "error", true);
            }
        });
    }
}

function inArray(arr, testStr) {
    let regex = new RegExp(arr.join("|"), "i");
    return regex.test(testStr);
}

function appendDivScore(db, domParent, bestMatches, articleName) {
    let divFiller = document.createElement("div");
    divFiller.style.flexGrow = "1";
    domParent.append(divFiller);

    let divScore = document.createElement("div");
    let boxContent = "&nbsp;?&nbsp;";
    let boxColor = "grey";

    divScore.classList.add(CLASS_SCORE_BOX_CREATED);

    if (bestMatches === undefined || bestMatches === null || bestMatches.length === 0) {
        divScore.classList.add(IDCLASS_NAMES.cl_scoreBoxNoLink);
        let warn = svgWarn();
        domParent.append(warn);
        addTippy(warn, `NO ${db.name.toUpperCase()} FOUND :(`);
    }
    else if (bestMatches.length === 1) {
        let matchItem = bestMatches[0];
        let scoreForColor = null;
        if (db.useTopScoresPercent) {
            scoreForColor = Math.min(1, matchItem.percent_avgtop);
            log("using avgtop for color : " + scoreForColor, "debug")
        }
        else {
            scoreForColor = matchItem.percent_best;
            log("using best for color : " + scoreForColor, "debug")
        }
        let rgb = pickHex(COLOR_HOT, COLOR_COLD, scoreForColor);
        boxContent = `<a href="${db.lookupHrefBase + matchItem.href}" target="_blank">${cleanNumber(matchItem[db.scoreKey])}</a>`;
        boxColor = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
        log("rgb generated : " + boxColor, "debug");
        if (scoreCompare[db.name] !== undefined && scoreCompare[db.name] !== null && scoreCompare[db.name].length >= 1) {
            let tippyHeader = `<div class="tippyTitle">${matchItem.name}</div>`;
            addTippy(divScore, tippyHeader + comparisonTippy(matchItem.score_int, scoreCompare[db.name], db.name));
        }
    }
    else if (bestMatches.length !== 1) {
        divScore.classList.add(IDCLASS_NAMES.cl_scoreBoxNoLink);
        let warn = svgWarn();
        log(articleName)
        log(bestMatches, "info", true)
        domParent.append(warn);
        addMultipleMatchTippy(warn, db, bestMatches, articleName);
    }
    else {
        divScore.classList.add(IDCLASS_NAMES.cl_scoreBoxNoLink);
        let warn = svgWarn();
        domParent.append(warn);
        addTippy(warn, "Unknown error")
    }
    divScore.classList.add(IDCLASS_NAMES.cl_scoreBox);
    divScore.style.borderColor = boxColor;
    divScore.style.backgroundColor = boxColor;
    divScore.innerHTML = boxContent;
    domParent.append(divScore);
}

function comparisonTippy(itemScore, otherItems, dbName) {
    let content = `<div>Comparison with other ${dbName.toUpperCase()} :</div><table>`;
    otherItems.forEach(otherItem => {
        let percentDelta = Math.round(((itemScore / otherItem.score) - 1) * 100);
        let colorClass = "";
        let prefix = "";
        if (percentDelta > 0) {
            prefix = "+";
            colorClass = "positive";
        }
        else {
            colorClass = "negative";
        }
        content += "<tr>";
        content += `<td>${otherItem.name}</td>`;
        content += `<td class="right">${cleanNumber(otherItem.score.toLocaleString("en-US"))}</td>`;
        content += `<td class="right ${colorClass}">${prefix + percentDelta} %</td>`;
        content += "</tr>";
    });
    content += "</table>"
    return content;
}

function addMultipleMatchTippy(warn, db, bestMatches, articleName) {
    let title = `Multiple ${db.name.toUpperCase()} found:`;
    let titleExt = `${bestMatches.length} ${db.name.toUpperCase()} found for : ${articleName}`;
    let maxArr = 10;
    let tooManyMatches = bestMatches.length > maxArr;

    let content = `<div>${title}</div><table>`;
    bestMatches.slice(0, maxArr).forEach(matchItem => {
        content += `
        <tr class="tippyHighlight">
            <td><a href="${db.lookupHrefBase + matchItem.href}" target="_blank">${matchItem.name}</a></td>
            <td class="right">${cleanNumber(matchItem[db.scoreKey])}</td>
        </tr>`;
    });
    content += "</table>"
    let cbMount = null;
    let cbHidden = null;
    if (tooManyMatches) {
        let moreResultsModal = createModal(titleExt, createModalTable(db, bestMatches));
        content += `<div class="seeMoreModal" data-micromodal-trigger="${moreResultsModal.modalId}">+ ${(bestMatches.length - maxArr)} more...</div>`;
        document.querySelector("body").append(moreResultsModal.modalBody);
        cbMount = () => {
            let modalTrigger = document.querySelector(`div[data-micromodal-trigger="${moreResultsModal.modalId}"]`);
            if (!modalTrigger.dataset.isListenerAdded) {
                modalTrigger.addEventListener('click', () => {
                    modalOpen(moreResultsModal.modalId);
                });
                modalTrigger.dataset.isListenerAdded = true;
            }
        };
    }
    addTippy(warn, content, cbMount, cbHidden);
}

function svgWarn() {
    let warn = document.createElement("div");
    let svgCode = "<svg width='100%' height='100%' viewBox='0 0 50 44' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' xml:space='preserve' xmlns:serif='http://www.serif.com/' style='fill-rule:evenodd;clip-rule:evenodd;'><g id='g4' transform='matrix(0.290532,0,0,0.290532,0.0142698,0.500651)'><path id='path6' d='M76.5,6L7.5,125.5L17,142L155,142L164.5,125.5L95.5,6L76.5,6Z' style='fill:rgb(248,222,0);fill-rule:nonzero;stroke:black;stroke-width:12px;'/><path id='path8' d='M75,125L97,125L97,108L75,108L75,125ZM75,96L97,96L97,49L75,49L75,96Z' style='fill-rule:nonzero;'/></g></svg>";
    warn.innerHTML = svgCode;
    warn.classList.add(IDCLASS_NAMES.cl_scoreBoxWarn);
    return warn;
}

function addTippy(domElem, text, callbackOnMount = null, callbackOnHidden = null) {
    tippy(domElem, {
        content: text,
        theme: "digitec",
        animation: "shift-away",
        duration: 100,
        placement: "top-end",
        allowHTML: true,
        interactive: true,
        appendTo: document.body,
        onMount() {
            callbackOnMount?.();
        },
        onHidden() {
            callbackOnHidden?.();
        },
        //hideOnClick: false, trigger: 'click'
    });
}

function createModalTable(db, bestMatches) {
    let col = "col1";
    if (bestMatches.length > 80) {
        col = "col3";
    }
    else if (bestMatches.length > 40) {
        col = "col2";
    }
    let modalTable = `<div class="${IDCLASS_NAMES.cl_modalItemsList} ${col}">`;
    bestMatches.forEach(matchItem => {
        modalTable += `
        <div class="${IDCLASS_NAMES.cl_modalItemContainer}">
            <div class="${IDCLASS_NAMES.cl_modalItemName}"><a href="${db.lookupHrefBase + matchItem.href}" target="_blank">${matchItem.name}</a></div>
            <div class="${IDCLASS_NAMES.cl_modalItemScore}">${cleanNumber(matchItem[db.scoreKey])}</div>
        </div>
    `;
    });
    modalTable += "</div>";
    return modalTable;
}

function createModal(title, body) {
    let allModals = document.querySelectorAll("." + IDCLASS_NAMES.cl_modal);
    let maxModalNum = 0;
    if (allModals.length > 0) {
        maxModalNum = Array.from(allModals).reduce((a, b) => a.dataset.microModalIdentifierNum > b.dataset.microModalIdentifierNum ? a : b).dataset.microModalIdentifierNum;
        maxModalNum = parseInt(maxModalNum);
    }
    let modalNum = maxModalNum + 1;
    let modalId = "micro-modal-identifier-" + modalNum;

    let modalBody = document.createElement("div");
    modalBody.classList.add(IDCLASS_NAMES.cl_modal);
    modalBody.id = modalId;
    modalBody.dataset.microModalIdentifierNum = modalNum;
    modalBody.innerHTML = `
    <div class="${IDCLASS_NAMES.cl_modalOverlay}" tabindex="-1" data-micromodal-close>
        <div class="${IDCLASS_NAMES.cl_modalContainer}">
            <header class="${IDCLASS_NAMES.cl_modalHeader}">
                <h2 class="${IDCLASS_NAMES.cl_modalTitle}" id="${modalId}-title">${title}</h2>
                <div class="${IDCLASS_NAMES.cl_modalClose}" data-micromodal-close></div>
            </header>
            <div class="${IDCLASS_NAMES.cl_modalContent}" id="${modalId}-content">${body}</div>
        </div>
    </div>
    `;

    return {
        modalId,
        modalBody
    }
}

function modalOpen(modalId) {
    MicroModal.show(modalId, {
        disableScroll: true
    });
}

function cleanNumber(num) {
    let cleanNum = num;
    cleanNum = cleanNum.replace(/,/gi, "'");
    return cleanNum;
}

function pickHex(color1, color2, weight) {
    let p = weight;
    let w = p * 2 - 1;
    let w1 = (w / 1 + 1) / 2;
    let w2 = 1 - w1;
    let rgb = [Math.round(color1[0] * w1 + color2[0] * w2),
    Math.round(color1[1] * w1 + color2[1] * w2),
    Math.round(color1[2] * w1 + color2[2] * w2)];
    return rgb;
}

function log(val, level = "info", raw = false) {
    if (LOG_ENABLED) {
        let output = null;
        if (raw) {
            output = val;
        }
        else {
            let now = new Date();
            let h = now.getHours().toString().padStart(2, "0");
            let m = now.getMinutes().toString().padStart(2, "0");
            let s = now.getSeconds().toString().padStart(2, "0");
            let ms = now.getMilliseconds().toString().padStart(3, "0");
            let time = h + ":" + m + ":" + s + "." + ms;
            output = "[" + time + "] " + val;
        }
        if (LOG_FORCE_TRACE) {
            console.trace()
        }
        else if (level === "debug") {
            console.debug(output);
        }
        else if (level === "info") {
            console.log(output);
        }
        else if (level === "warn") {
            console.warn(output);
        }
        else if (level === "error") {
            console.error(output);
        }
        else {
            console.error("Unknow log level");
        }
    }
}



checkStoredDataVersion();
injectCss();

window.addEventListener("load", () => {
    pageRoot = document.querySelector(OBSERVE_ROOT);
    analyseArticles();
    observeArticles();
}, false);
