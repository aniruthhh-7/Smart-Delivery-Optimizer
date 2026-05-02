const canvas = document.getElementById('tspCanvas');
const ctx = canvas.getContext('2d');
const btnGenerate = document.getElementById('btnGenerate');
const btnRun = document.getElementById('btnRun');
const logsDiv = document.getElementById('logs');
const nodeSelect = document.getElementById('nodeCount');
const bestRouteText = document.getElementById('bestRouteDisplay');

let points = [];
let NUM_NODES = parseInt(nodeSelect.value);
const LABELS = Array.from({length: 26}, (_, i) => String.fromCharCode(65 + i));
let bestCostGlobal = Infinity;
let bestPathGlobal = null;
let totalExplored = 0;
let totalPruned = 0;
let isRunning = false;

let iterationsSinceYield = 0;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function addLog(message, type = "") {
    const el = document.createElement('div');
    el.className = `log-entry ${type}`;
    el.innerHTML = message;
    logsDiv.appendChild(el);
    logsDiv.scrollTop = logsDiv.scrollHeight;
}

function updateBestRouteText(pathStr, distance) {
    if(!pathStr) {
        bestRouteText.innerHTML = `🏁 <strong>Status:</strong> Waiting for you to start finding a route...`;
    } else {
        bestRouteText.innerHTML = `<span class="tag">YOUR DRIVING INSTRUCTIONS:</span> ${pathStr} &nbsp;&nbsp;|&nbsp;&nbsp; <span class="tag">TOTAL TRIP DISTANCE:</span> ${distance.toFixed(1)} km`;
    }
}

function dist(p1, p2) {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

function generatePoints() {
    NUM_NODES = parseInt(nodeSelect.value);
    points = [];
    const padding = 40;
    const w = canvas.width - padding * 2;
    const h = canvas.height - padding * 2;
    for (let i = 0; i < NUM_NODES; i++) {
        points.push({
            x: padding + Math.random() * w,
            y: padding + Math.random() * h
        });
    }
    
    bestCostGlobal = Infinity;
    bestPathGlobal = null;
    logsDiv.innerHTML = '';
    btnRun.disabled = false;
    updateBestRouteText(null, null);
    
    drawBase();
    addLog(`📍 New delivery map generated with ${NUM_NODES} stops.`);
}

function drawLineWithArrows(p1, p2, isBest=false) {
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const angle = Math.atan2(dy, dx);
    const arrowX = p1.x + dx * 0.55;
    const arrowY = p1.y + dy * 0.55;
    
    const headlen = isBest ? 10 : 7; 
    
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(arrowX - headlen * Math.cos(angle - Math.PI / 6), arrowY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(arrowX - headlen * Math.cos(angle + Math.PI / 6), arrowY - headlen * Math.sin(angle + Math.PI / 6));
}

function drawBase() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the Best current optimal path
    if (bestPathGlobal) {
        ctx.beginPath();
        ctx.strokeStyle = '#60a5fa'; // Soft blue
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = 3;
        
        for (let i = 0; i < bestPathGlobal.length - 1; i++) {
            const p1 = points[bestPathGlobal[i]];
            const p2 = points[bestPathGlobal[i+1]];
            drawLineWithArrows(p1, p2, true);
        }
        ctx.stroke();
    }

    // Nodes
    points.forEach((p, i) => {
        ctx.beginPath();
        // Slightly highlight starting "A" Node
        ctx.arc(p.x, p.y, i === 0 ? 8 : 6, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? '#1e293b' : '#0c0a09'; 
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = i === 0 ? '#a78bfa' : '#57534e';
        ctx.stroke();
        
        ctx.fillStyle = '#d6d3d1';
        ctx.font = '500 13px Inter';
        let label = i === 0 ? "A (Start)" : LABELS[i];
        ctx.fillText(label, p.x + 10, p.y + 4);
    });
}

function drawCurrentPath(path, colorType) {
    drawBase(); 
    
    ctx.beginPath();
    let style = '#57534e'; 
    let lineW = 2;
    
    if (colorType === 'red') { style = '#fb7185'; lineW = 1.5; } 
    else if (colorType === 'green') { style = '#34d399'; }
    else if (colorType === 'blue') { style = '#60a5fa'; lineW = 3; }
    else if (colorType === 'gray') { style = '#57534e'; lineW = 1; }
    
    ctx.strokeStyle = style;
    ctx.lineWidth = lineW;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    
    for (let i = 0; i < path.length - 1; i++) {
        const p1 = points[path[i]];
        const p2 = points[path[i+1]];
        drawLineWithArrows(p1, p2, false);
    }
    ctx.stroke();
}

function getGreedyInitialBound() {
    let unvisited = Array.from({length: NUM_NODES}, (_, i) => i);
    unvisited.splice(0, 1);
    let curr = 0;
    let cost = 0;
    let path = [0];
    
    while(unvisited.length > 0) {
        let nearestCost = Infinity;
        let nearestIdx = -1;
        let pToRemove = -1;
        for(let i=0; i<unvisited.length; i++) {
            let nInfo = unvisited[i];
            let d = dist(points[curr], points[nInfo]);
            if(d < nearestCost) {
                nearestCost = d;
                nearestIdx = nInfo;
                pToRemove = i;
            }
        }
        cost += nearestCost;
        curr = nearestIdx;
        path.push(curr);
        unvisited.splice(pToRemove, 1);
    }
    cost += dist(points[curr], points[0]);
    path.push(0);
    return { cost, path };
}

async function tspBranchAndBound(currNode, currentPath, currentCost, visited) {
    iterationsSinceYield++;
    
    if (iterationsSinceYield % 1000 === 0) {
        await sleep(0);
    }
    
    const isAnimMode = NUM_NODES <= 8;

    if (currentCost >= bestCostGlobal) {
        if(isAnimMode) {
            let pathStr = currentPath.map(i => LABELS[i]).join(' → ');
            addLog(`Skipped bad route: ${pathStr} ❌ (Already longer than our ${bestCostGlobal.toFixed(0)} km limit!)`, 'log-prune');
            drawCurrentPath(currentPath, 'red');
            await sleep(40);
        }
        totalPruned++;
        return;
    }

    if (currentPath.length === NUM_NODES) {
        let distToStart = dist(points[currNode], points[currentPath[0]]);
        let totalCost = currentCost + distToStart;
        let pathWithReturn = [...currentPath, currentPath[0]];
        
        totalExplored++;
        
        if(isAnimMode) {
            drawCurrentPath(pathWithReturn, 'green');
            await sleep(30);
        }

        if (totalCost < bestCostGlobal) {
            bestCostGlobal = totalCost;
            bestPathGlobal = [...pathWithReturn];
            let pathStr = bestPathGlobal.map(i=>LABELS[i]).join(' → ');
            updateBestRouteText(pathStr, bestCostGlobal);

            addLog(`Found a faster route! (${bestCostGlobal.toFixed(1)} km) => ${pathStr}`, 'log-best');
            
            if(isAnimMode) {
                drawCurrentPath(pathWithReturn, 'blue');
                await sleep(150); 
            } else {
                drawBase(); 
                await sleep(0);
            }
        }
        return;
    }

    for (let nextNode = 0; nextNode < NUM_NODES; nextNode++) {
        if (!visited[nextNode]) {
            visited[nextNode] = true;
            currentPath.push(nextNode);
            
            let d = dist(points[currNode], points[nextNode]);
            
            if (isAnimMode && NUM_NODES <= 6) {
                drawCurrentPath(currentPath, 'gray'); 
                await sleep(15);
            }

            await tspBranchAndBound(nextNode, currentPath, currentCost + d, visited);
            
            currentPath.pop();
            visited[nextNode] = false;
        }
    }
}

btnGenerate.addEventListener('click', () => {
    if(isRunning) return;
    generatePoints();
});

nodeSelect.addEventListener('change', () => {
    if(!isRunning) generatePoints();
});

btnRun.addEventListener('click', async () => {
    if(points.length === 0 || isRunning) return;
    isRunning = true;
    btnGenerate.disabled = true;
    btnRun.disabled = true;
    nodeSelect.disabled = true;
    
    logsDiv.innerHTML = '';
    const isAnimMode = NUM_NODES <= 8;
    
    let greedy = getGreedyInitialBound();
    bestCostGlobal = greedy.cost;
    bestPathGlobal = greedy.path;
    updateBestRouteText(bestPathGlobal.map(i=>LABELS[i]).join(' → '), bestCostGlobal);
    
    addLog(`First we do a quick scan to find a decent limit line of ${bestCostGlobal.toFixed(1)} km. Automatically skipping anything slower!`);

    if(!isAnimMode) {
        addLog(`⚡ Lots of stops detected! Skipping the visual animation to give you the answer instantly.`, "log-best");
    }

    totalExplored = 0;
    totalPruned = 0;
    iterationsSinceYield = 0;

    let visited = new Array(NUM_NODES).fill(false);
    visited[0] = true; 
    
    let startTime = performance.now();
    await tspBranchAndBound(0, [0], 0.0, visited);
    let endTime = performance.now();
    
    drawBase(); 
    
    addLog(`<b>Finished thinking in:</b> ${((endTime-startTime)/1000).toFixed(3)} seconds`);
    addLog(`<b>Best Driving Distance:</b> ${bestCostGlobal.toFixed(2)} km`, 'log-best');
    addLog(`<b>Total route combinations checked:</b> ${totalExplored}`, 'log-explored');
    addLog(`<b>Slow routes skipped instantly:</b> ${totalPruned} (This makes the app super fast!)`, 'log-prune');
    
    isRunning = false;
    btnGenerate.disabled = false;
    btnRun.disabled = false;
    nodeSelect.disabled = false;
});

// Start state
generatePoints();
