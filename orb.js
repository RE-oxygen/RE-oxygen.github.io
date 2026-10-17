// 首页与作品页共用的交互式光点星体。
(() => {
    const canvas = document.getElementById('circleCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compact = () => window.innerWidth < 700;
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const pointCount = compact() ? 560 : 1500;
    const points = Array.from({ length: pointCount }, (_, index) => {
        const y = 1 - 2 * (index + .5) / pointCount;
        const spread = Math.sqrt(1 - y * y);
        const angle = index * goldenAngle;
        return {
            x: Math.cos(angle) * spread,
            y,
            z: Math.sin(angle) * spread,
            angle,
            size: index % 29 === 0 ? 1.7 : index % 6 === 0 ? 1.1 : .65,
            accent: index % 19 === 0,
            dash: index % 7 === 0
        };
    });

    const dust = Array.from({ length: compact() ? 38 : 68 }, (_, index) => ({
        x: (Math.sin(index * 89.7) * 43758.5453) % 1,
        y: (Math.sin(index * 41.3) * 12415.9261) % 1,
        size: index % 9 === 0 ? 1.4 : .65,
        phase: index * 1.73
    }));
    dust.forEach(particle => {
        particle.x = Math.abs(particle.x);
        particle.y = Math.abs(particle.y);
    });

    const interaction = {
        pointerX: -10000,
        pointerY: -10000,
        rotationX: -.22,
        rotationY: .34,
        autoSpin: 0,
        velocityX: 0,
        velocityY: 0,
        dragging: false,
        moved: false,
        lastX: 0,
        lastY: 0,
        pressX: 0,
        pressY: 0,
        pulse: null
    };

    let frame = 0;
    let lastFrame = 0;
    let lastDraw = 0;
    let baseRadius = 0;
    let scene = 'hero';
    let albumIndex = 0;
    let albumAccent = [185, 147, 181];
    const detailNumber = Number(window.location.pathname.match(/portfolio-(\d+)\.html$/)?.[1] || 0);
    const detailAccents = [null, [185, 147, 181], [130, 201, 163], [85, 181, 176], [120, 174, 244], [169, 219, 105]];
    const profiles = {
        hero: { x: .72, y: .49, radius: 1, opacity: 1, shape: 0 },
        about: { x: .25, y: .49, radius: 1, opacity: .77, shape: 1 },
        portfolio: { x: .75, y: .52, radius: 1, opacity: .8, shape: 2 },
        contact: { x: .25, y: .51, radius: 1, opacity: .69, shape: 3 },
        detail: { x: .75, y: .48, radius: 1, opacity: .82, shape: 2 }
    };
    const detailShapes = [
        null,
        { x: .25, y: .48, shape: 2 },
        { x: .75, y: .48, shape: 1 },
        { x: .25, y: .48, shape: 3 },
        { x: .75, y: .48, shape: 0 },
        { x: .25, y: .48, shape: 1 }
    ];
    const portfolioShapes = [2, 1, 3, 0, 1];
    const tetraVertices = [
        [1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]
    ].map(vertex => vertex.map(value => value / Math.sqrt(3)));
    const size = { x: 0, y: 0, radius: 0, opacity: 1 };
    const target = { ...size };
    const shapeWeights = [1, 0, 0, 0];
    const targetShapeWeights = [1, 0, 0, 0];
    const palette = { mid: [166, 145, 211], light: [228, 215, 248], accent: [247, 210, 172], halo: [121, 94, 173] };
    let targetPalette = palette;

    function activeScene() {
        if (detailNumber) return 'detail';
        let next = 'hero';
        for (const name of ['about', 'portfolio', 'contact']) {
            const section = document.getElementById(name);
            if (section && section.getBoundingClientRect().top < window.innerHeight * .55) next = name;
        }
        return next;
    }

    function updateScene(immediate = false) {
        const nextScene = activeScene();
        if (nextScene !== scene && !immediate && !reducedMotion.matches)
            interaction.pulse = { x: size.x, y: size.y, time: performance.now() / 1000 };
        scene = nextScene;
        const mobile = compact();
        const profile = scene === 'detail'
            ? { ...profiles.detail, ...(detailShapes[detailNumber] || {}) }
            : profiles[scene];
        const positionX = mobile ? (profile.x < .5 ? .36 : .64) : profile.x;
        target.x = window.innerWidth * positionX;
        target.y = window.innerHeight * (mobile ? (scene === 'about' ? .4 : .46) : profile.y);
        target.radius = baseRadius;
        target.opacity = profile.opacity;
        const shape = scene === 'portfolio' ? portfolioShapes[albumIndex] : profile.shape;
        for (let i = 0; i < 4; i++) targetShapeWeights[i] = Number(i === shape);
        const accent = scene === 'portfolio' ? albumAccent
            : scene === 'detail' ? detailAccents[detailNumber] || detailAccents[1]
                : scene === 'about' ? [201, 193, 234]
                    : [247, 210, 172];
        const luminousAccent = scene === 'portfolio' || scene === 'detail'
            ? accent.map(channel => channel * .8 + 255 * .2) : accent;
        targetPalette = {
            mid: scene === 'about' ? [173, 171, 211] : [166, 145, 211],
            light: scene === 'portfolio' ? [219, 215, 231] : [228, 215, 248],
            accent: luminousAccent,
            halo: scene === 'portfolio' || scene === 'detail' ? accent : [121, 94, 173]
        };
        if (immediate || reducedMotion.matches) {
            Object.assign(size, target);
            for (let i = 0; i < 4; i++) shapeWeights[i] = targetShapeWeights[i];
            for (const key of Object.keys(palette)) palette[key] = [...targetPalette[key]];
        }
    }

    function easeScene() {
        for (const key of Object.keys(size)) size[key] += (target[key] - size[key]) * .055;
        for (let i = 0; i < 4; i++) shapeWeights[i] += (targetShapeWeights[i] - shapeWeights[i]) * .055;
        for (const key of Object.keys(palette)) {
            for (let i = 0; i < 3; i++) palette[key][i] += (targetPalette[key][i] - palette[key][i]) * .055;
        }
    }

    function rgb(values) { return values.map(Math.round).join(','); }

    function measure() {
        const mobile = compact();
        baseRadius = mobile
            ? Math.min(window.innerWidth * .4, window.innerHeight * .29, 176)
            : Math.min(window.innerWidth * .265, window.innerHeight * .39, 350);
        updateScene(true);
    }

    function resize() {
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(window.innerWidth * ratio);
        canvas.height = Math.round(window.innerHeight * ratio);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        measure();
        draw(reducedMotion.matches ? 0 : performance.now() / 1000);
    }

    function shapeCoordinates(point, time) {
        const { x, y, z } = point;
        const sphereWave = 1 + Math.sin(point.angle * .072 + y * 8 - time * .55) * .026;
        const cubeScale = .78 / Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
        let tetraScale = Infinity;
        for (const normal of tetraVertices) {
            const dot = x * normal[0] + y * normal[1] + z * normal[2];
            if (dot < 0) tetraScale = Math.min(tetraScale, -1 / (3 * dot));
        }
        const period = Math.PI * 2 / 5;
        const angle = Math.atan2(y, x) - Math.PI / 2;
        const phase = ((angle % period) + period) % period / period;
        const starRadius = .46 + .54 * Math.abs(2 * phase - 1);
        tetraScale *= 1.62;
        const starX = x * starRadius * 1.16;
        const starY = y * starRadius * 1.16;
        const starZ = z * .34 * 1.16;
        return [
            x * sphereWave * shapeWeights[0] + x * cubeScale * shapeWeights[1]
                + x * tetraScale * shapeWeights[2] + starX * shapeWeights[3],
            y * sphereWave * shapeWeights[0] + y * cubeScale * shapeWeights[1]
                + y * tetraScale * shapeWeights[2] + starY * shapeWeights[3],
            z * sphereWave * shapeWeights[0] + z * cubeScale * shapeWeights[1]
                + z * tetraScale * shapeWeights[2] + starZ * shapeWeights[3]
        ];
    }

    function projectCoordinates(x, y, z, time) {
        const turnY = interaction.rotationY + interaction.autoSpin;
        const cy = Math.cos(turnY);
        const sy = Math.sin(turnY);
        const x1 = x * cy + z * sy;
        const z1 = z * cy - x * sy;
        const cx = Math.cos(interaction.rotationX);
        const sx = Math.sin(interaction.rotationX);
        const y1 = y * cx - z1 * sx;
        const depth = y * sx + z1 * cx;
        const scale = 4.2 / (4.2 - depth);
        return {
            x: size.x + x1 * size.radius * scale,
            y: size.y + y1 * size.radius * scale,
            depth,
            scale
        };
    }

    function project(point, time) {
        return projectCoordinates(...shapeCoordinates(point, time), time);
    }

    function drawAtmosphere(time) {
        const halo = ctx.createRadialGradient(size.x, size.y, size.radius * .18, size.x, size.y, size.radius * 1.75);
        const glow = scene === 'hero' ? 1 : 1.2;
        halo.addColorStop(0, `rgba(${rgb(palette.halo)}, ${.13 * size.opacity * glow})`);
        halo.addColorStop(.5, `rgba(${rgb(palette.mid)}, ${.065 * size.opacity * glow})`);
        halo.addColorStop(1, 'rgba(5, 7, 13, 0)');
        ctx.fillStyle = halo;
        ctx.fillRect(size.x - size.radius * 1.75, size.y - size.radius * 1.75, size.radius * 3.5, size.radius * 3.5);

        dust.forEach(particle => {
            const twinkle = .14 + (Math.sin(time * .6 + particle.phase) + 1) * .09;
            ctx.fillStyle = `rgba(${rgb(palette.mid)}, ${twinkle * size.opacity})`;
            ctx.beginPath();
            ctx.arc(particle.x * window.innerWidth, particle.y * window.innerHeight, particle.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function drawCore() {
        const cohesion = Math.max(0, shapeWeights[0]);
        if (cohesion < .025) return;
        const coreStrength = scene === 'hero' ? 1 : .58;
        const core = ctx.createRadialGradient(
            size.x - size.radius * .29, size.y - size.radius * .32, size.radius * .07,
            size.x, size.y, size.radius * 1.08
        );
        core.addColorStop(0, `rgba(47, 47, 72, ${.84 * size.opacity * cohesion * coreStrength})`);
        core.addColorStop(.4, `rgba(21, 26, 41, ${.91 * size.opacity * cohesion * coreStrength})`);
        core.addColorStop(.76, `rgba(11, 17, 29, ${.88 * size.opacity * cohesion * coreStrength})`);
        core.addColorStop(1, `rgba(9, 13, 25, ${.13 * cohesion * coreStrength})`);
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(size.x, size.y, size.radius * 1.08, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawPoint(point, projected, time) {
        const front = Math.max(0, projected.depth);
        const rear = Math.max(0, -projected.depth);
        const dx = projected.x - interaction.pointerX;
        const dy = projected.y - interaction.pointerY;
        const hover = reducedMotion.matches ? 0
            : Math.exp(-(dx * dx + dy * dy) / (size.radius * size.radius * .095)) * Math.max(0, front);

        let pulse = 0;
        if (interaction.pulse && !reducedMotion.matches) {
            const elapsed = time - interaction.pulse.time;
            if (elapsed >= 0 && elapsed < 1.15) {
                const distance = Math.hypot(projected.x - interaction.pulse.x, projected.y - interaction.pulse.y);
                const edge = elapsed * size.radius * 1.8;
                pulse = Math.exp(-Math.pow((distance - edge) / (size.radius * .075), 2)) * (1 - elapsed / 1.15);
            }
        }

        const outwardX = (projected.x - size.x) / size.radius;
        const outwardY = (projected.y - size.y) / size.radius;
        const displacement = hover * 13 + pulse * 21;
        const x = projected.x + outwardX * displacement;
        const y = projected.y + outwardY * displacement;
        const light = clamp((projected.depth + point.x * .28 - point.y * .18 + .35) / 1.6, 0, 1);
        const lift = scene === 'hero' ? 0 : .08;
        const alpha = projected.depth < 0 ? .14 + (1 - rear) * .13 + lift * .6
            : .36 + light * .54 + lift;
        const opacity = clamp((alpha + hover * .25 + pulse * .65) * size.opacity, 0, 1);
        const radius = point.size * projected.scale * (1 + hover * .8 + pulse * 1.1);
        const color = point.accent
            ? `rgba(${rgb(palette.accent)}, ${opacity})`
            : light > .58
                ? `rgba(${rgb(palette.light)}, ${opacity})`
                : `rgba(${rgb(palette.mid)}, ${opacity})`;

        ctx.fillStyle = color;
        if (point.dash && projected.depth > -.15) {
            ctx.strokeStyle = color;
            ctx.lineWidth = Math.max(.6, radius * .75);
            ctx.beginPath();
            ctx.moveTo(x - radius * 1.7, y + radius * .9);
            ctx.lineTo(x + radius * 1.7, y - radius * .9);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(x, y, Math.max(.45, radius), 0, Math.PI * 2);
            ctx.fill();
        }

        if ((point.size > 1.5 && projected.depth > .2) || pulse > .5) {
            ctx.beginPath();
            ctx.arc(x, y, radius * (pulse > .5 ? 5 : 3.3), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(190, 169, 240, ${.055 + pulse * .085})`;
            ctx.fill();
        }
    }

    function draw(time) {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        drawAtmosphere(time);
        const projected = points.map(point => ({ point, position: project(point, time) }));
        projected.sort((a, b) => a.position.depth - b.position.depth);
        for (const entry of projected) {
            if (entry.position.depth >= 0) break;
            drawPoint(entry.point, entry.position, time);
        }
        drawCore();
        for (const entry of projected) {
            if (entry.position.depth < 0) continue;
            drawPoint(entry.point, entry.position, time);
        }
    }

    function tick(now) {
        frame = 0;
        if (document.hidden || reducedMotion.matches) return;
        const delta = Math.min(32, now - (lastFrame || now));
        lastFrame = now;
        easeScene();
        if (!interaction.dragging) {
            interaction.autoSpin += delta * .000105;
            interaction.rotationX = clamp(interaction.rotationX + interaction.velocityX * delta, -.8, .8);
            interaction.rotationY += interaction.velocityY * delta;
            interaction.velocityX *= Math.pow(.91, delta / 16);
            interaction.velocityY *= Math.pow(.93, delta / 16);
            const pointerTilt = interaction.pointerX < 0 ? 0
                : -clamp((interaction.pointerY - size.y) / window.innerHeight, -.2, .2);
            interaction.rotationX += (-.22 + pointerTilt - interaction.rotationX) * .008;
        }
        if (scene === 'hero' || now - lastDraw >= 32) {
            draw(now / 1000);
            lastDraw = now;
        }
        frame = requestAnimationFrame(tick);
    }

    function start() {
        if (!frame && !reducedMotion.matches && !document.hidden) {
            lastFrame = 0;
            frame = requestAnimationFrame(tick);
        }
    }

    function withinSphere(x, y) {
        return Math.hypot(x - size.x, y - size.y) < size.radius * 1.4;
    }

    window.addEventListener('pointermove', event => {
        interaction.pointerX = event.clientX;
        interaction.pointerY = event.clientY;
        if (!interaction.dragging) return;
        const dx = event.clientX - interaction.lastX;
        const dy = event.clientY - interaction.lastY;
        interaction.moved ||= Math.hypot(event.clientX - interaction.pressX, event.clientY - interaction.pressY) > 5;
        interaction.rotationY += dx * .006;
        interaction.rotationX = clamp(interaction.rotationX - dy * .005, -.8, .8);
        interaction.velocityY = dx * .00035;
        interaction.velocityX = -dy * .00025;
        interaction.lastX = event.clientX;
        interaction.lastY = event.clientY;
    }, { passive: true });

    window.addEventListener('pointerdown', event => {
        if (reducedMotion.matches || !withinSphere(event.clientX, event.clientY)) return;
        if (event.target?.closest?.('a, button, input, textarea, select, [role="button"]')) return;
        interaction.pointerX = event.clientX;
        interaction.pointerY = event.clientY;
        interaction.pressX = event.clientX;
        interaction.pressY = event.clientY;
        interaction.lastX = event.clientX;
        interaction.lastY = event.clientY;
        interaction.moved = false;
        interaction.dragging = event.pointerType !== 'touch';
        if (event.pointerType === 'mouse') event.preventDefault();
    });

    window.addEventListener('pointerup', event => {
        if (withinSphere(interaction.pressX, interaction.pressY) && !interaction.moved
            && Math.hypot(event.clientX - interaction.pressX, event.clientY - interaction.pressY) < 8
            && !reducedMotion.matches) {
            interaction.pulse = { x: event.clientX, y: event.clientY, time: performance.now() / 1000 };
        }
        interaction.dragging = false;
        interaction.pressX = -10000;
        interaction.pressY = -10000;
    });

    window.addEventListener('pointercancel', () => { interaction.dragging = false; });
    document.querySelector('.sphere-interaction-hint')?.addEventListener('click', () => {
        if (reducedMotion.matches) return;
        interaction.rotationY += .38;
        interaction.velocityY += .003;
        interaction.pulse = { x: size.x, y: size.y, time: performance.now() / 1000 };
    });
    window.addEventListener('pointerout', event => {
        if (!event.relatedTarget) {
            interaction.pointerX = -10000;
            interaction.pointerY = -10000;
        }
    });
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', () => {
        updateScene();
        if (reducedMotion.matches) draw(0);
        else start();
    }, { passive: true });
    window.addEventListener('albumchange', event => {
        const hex = event.detail.accent.replace('#', '');
        albumAccent = [0, 2, 4].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
        albumIndex = event.detail.index;
        updateScene();
        if (scene === 'portfolio' && !reducedMotion.matches) {
            interaction.velocityY += (albumIndex % 2 ? 1 : -1) * .0015;
            interaction.pulse = { x: size.x, y: size.y, time: performance.now() / 1000 };
        }
    });
    document.addEventListener('visibilitychange', start);
    reducedMotion.addEventListener('change', () => {
        if (reducedMotion.matches) {
            cancelAnimationFrame(frame);
            frame = 0;
            draw(0);
        } else start();
    });

    resize();
    start();
})();
