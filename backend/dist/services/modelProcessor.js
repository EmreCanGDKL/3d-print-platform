"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processModelForSecureViewing = processModelForSecureViewing;
exports.getMetadataForSQLite = getMetadataForSQLite;
// Basit STL parser (Three.js olmadan)
function parseSTL(buffer) {
    // ASCII mi Binary mi kontrol et
    const header = buffer.slice(0, 80).toString();
    const isBinary = !header.includes('solid');
    const positions = [];
    if (isBinary) {
        // Binary STL
        const numTriangles = buffer.readUInt32LE(80);
        let offset = 84;
        for (let i = 0; i < numTriangles; i++) {
            // Normal (3 floats) - atla
            offset += 12;
            // 3 vertex (9 floats)
            for (let j = 0; j < 9; j++) {
                positions.push(buffer.readFloatLE(offset));
                offset += 4;
            }
            // Attribute byte count - atla
            offset += 2;
        }
    }
    else {
        // ASCII STL
        const text = buffer.toString();
        const matches = text.match(/vertex\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/g);
        if (matches) {
            matches.forEach(match => {
                const parts = match.split(/\s+/);
                positions.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
            });
        }
    }
    return {
        positions,
        vertexCount: positions.length / 3
    };
}
function calculateVolumeAndArea(positions) {
    let volume = 0;
    let surfaceArea = 0;
    for (let i = 0; i < positions.length; i += 9) {
        const x1 = positions[i], y1 = positions[i + 1], z1 = positions[i + 2];
        const x2 = positions[i + 3], y2 = positions[i + 4], z2 = positions[i + 5];
        const x3 = positions[i + 6], y3 = positions[i + 7], z3 = positions[i + 8];
        // Volume (tetrahedron formula)
        volume += (x1 * (y2 * z3 - y3 * z2) -
            y1 * (x2 * z3 - x3 * z2) +
            z1 * (x2 * y3 - x3 * y2)) / 6;
        // Surface area
        const ax = x2 - x1, ay = y2 - y1, az = z2 - z1;
        const bx = x3 - x1, by = y3 - y1, bz = z3 - z1;
        const cx = ay * bz - az * by;
        const cy = az * bx - ax * bz;
        const cz = ax * by - ay * bx;
        surfaceArea += 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
    }
    return {
        volume: Math.abs(volume) / 1000, // cm³
        surfaceArea: surfaceArea / 100 // cm²
    };
}
async function processModelForSecureViewing(modelBuffer) {
    const { positions, vertexCount } = parseSTL(modelBuffer);
    const { volume, surfaceArea } = calculateVolumeAndArea(positions);
    // Bounding box hesapla
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < positions.length; i += 3) {
        minX = Math.min(minX, positions[i]);
        minY = Math.min(minY, positions[i + 1]);
        minZ = Math.min(minZ, positions[i + 2]);
        maxX = Math.max(maxX, positions[i]);
        maxY = Math.max(maxY, positions[i + 1]);
        maxZ = Math.max(maxZ, positions[i + 2]);
    }
    // Normals hesapla (basit)
    const normals = [];
    for (let i = 0; i < positions.length; i += 9) {
        const ax = positions[i + 3] - positions[i];
        const ay = positions[i + 4] - positions[i + 1];
        const az = positions[i + 5] - positions[i + 2];
        const bx = positions[i + 6] - positions[i];
        const by = positions[i + 7] - positions[i + 1];
        const bz = positions[i + 8] - positions[i + 2];
        let nx = ay * bz - az * by;
        let ny = az * bx - ax * bz;
        let nz = ax * by - ay * bx;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        if (len > 0) {
            nx /= len;
            ny /= len;
            nz /= len;
        }
        // Her vertex için aynı normal
        for (let j = 0; j < 3; j++) {
            normals.push(nx, ny, nz);
        }
    }
    const secureData = {
        type: 'SecureGeometry',
        version: '1.0',
        metadata: {
            vertexCount,
            boundingBox: [minX, minY, minZ, maxX, maxY, maxZ],
            volume,
            surfaceArea,
        },
        positions,
        normals,
        indices: null,
        security: {
            generatedAt: new Date().toISOString(),
            viewerOnly: true,
            downloadDisabled: true,
            watermark: 'PREVIEW_' + Math.random().toString(36).substring(7).toUpperCase(),
        },
    };
    return secureData;
}
function getMetadataForSQLite(secureData) {
    return {
        vertexCount: secureData.metadata.vertexCount,
        volume: secureData.metadata.volume,
        surfaceArea: secureData.metadata.surfaceArea
    };
}
