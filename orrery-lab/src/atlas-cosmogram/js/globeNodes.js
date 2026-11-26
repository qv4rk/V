/**
 * Article node placement on a Three.js Earth sphere + temporal horizon fade.
 */
import * as THREE from 'three';

const EARTH_RADIUS = 1;

/**
 * Convert geographic lat/lon (degrees) to a Vector3 on a sphere.
 * Y-up; lon 0 at +X, lat 0 at equator.
 */
export function latLonToVector3(lat, lon, radius = EARTH_RADIUS) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

export class ArticleNodeManager {
  constructor(scene, earthRadius = EARTH_RADIUS) {
    this.scene = scene;
    this.earthRadius = earthRadius;
    this.group = new THREE.Group();
    this.group.name = 'articleNodes';
    this.scene.add(this.group);
    this.nodes = [];
    this._rayMeshes = [];
  }

  addArticleNode(article) {
    const pos = latLonToVector3(article.lat, article.lon, this.earthRadius * 1.02);
    const geo = new THREE.SphereGeometry(0.028, 12, 12);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xc9a84c,
      transparent: true,
      opacity: 1,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.userData = {
      type: 'article',
      id: article.id,
      title: article.title,
      year: article.year,
      lat: article.lat,
      lon: article.lon,
      place: article.place || '',
      excerpt: article.excerpt || '',
      article
    };

    // soft glow ring
    const ringGeo = new THREE.RingGeometry(0.032, 0.048, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(pos);
    ring.lookAt(0, 0, 0);
    ring.userData = mesh.userData;

    this.group.add(mesh);
    this.group.add(ring);
    this.nodes.push(mesh, ring);
    return mesh;
  }

  loadArticles(list) {
    for (const a of list) {
      this.addArticleNode(a);
    }
  }

  /**
   * Inverse-square-ish luminance decay over ±50 year window.
   */
  updateTemporalHorizon(currentDialYear) {
    for (const node of this.nodes) {
      const year = node.userData.year;
      const deltaYears = Math.abs(currentDialYear - year);
      if (deltaYears > 50) {
        node.material.opacity = 0;
        node.visible = false;
      } else {
        const opacity = 1 / (1 + (deltaYears * deltaYears) / 25);
        node.material.opacity = opacity;
        node.visible = true;
      }
    }
  }

  getClickables() {
    return this.nodes.filter((n) => n.visible && n.userData.type === 'article');
  }

  dispose() {
    this.scene.remove(this.group);
    this.nodes = [];
  }
}

export default ArticleNodeManager;
