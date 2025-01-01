class Node {
	constructor(parentNode) {
		this.parentNode = parentNode; //Noeud parent
		this.childNode = []; //Noeud enfants

		this.p0 = null; //Position de depart de la branche
		this.p1 = null; //Position finale de la branche

		this.a0 = null; //Rayon de la branche a p0
		this.a1 = null; //Rayon de la branche a p1

		this.sections = null; //Liste contenant une liste de points representant les segments circulaires du cylindre generalise

		this.initialDirection = null; // Direction initiale de la branche
		this.animationMatrix = null; // Matrice pour l'animation de l'arbre

		this.branchPoints = [];
		this.leafPoints = [];
		this.applePoints = [];

		this.branchIndexes = [];
		this.leafIndexes = [];
		this.appleIndexes = [];
	}
}

TP3.Geometry = {

	simplifySkeleton: function (rootNode, rotationThreshold = 0.0001) {
		for (let i = 0; i < rootNode.childNode.length; ++i) {
			let child = rootNode.childNode[i];
			this.simplifySkeleton(child, rotationThreshold);
			// Si l'enfant est une fin de branche, on ne peut pas le simplifier
			if (child.childNode.length === 0)
				continue;

			// On trouve les vecteurs de direction pour le parent et l'enfant
			let parentVector = rootNode.p1.clone().sub(rootNode.p0)
			let childVector = child.p1.clone().sub(child.p0)
			// On calcule l'angle entre les deux vecteurs
			let angle = this.findRotation(parentVector, childVector)[1];
			if (angle < rotationThreshold) {
				// On connecte les petits-enfants au parent, ce qui enlève l'enfant
				for (let j  = 0; j < child.childNode.length; j++) {
					let grandchild = child.childNode[j]
					rootNode.p1 = grandchild.p0;
					rootNode.a1 = grandchild.a0;
					rootNode.childNode[j] = grandchild;
					grandchild.parentNode = rootNode;
				}
			}
		}

		return rootNode;
	},

	generateSegmentsHermite: function (rootNode, lengthDivisions = 4, radialDivisions = 8) {
		let processNode = (rootNode, movingFrame) => {
			let { p0, p1, a0, a1, parentNode, childNode } = rootNode;
			rootNode.sections = [];

			// On trouve les points et vecteurs de contrôle de la courbe d'hermite
			let h0 = p0;
			let h1 = p1;
			let v0 = parentNode ? parentNode.p1.clone().sub(parentNode.p0) : new THREE.Vector3(0, 1, 0);
			let v1 = p1.clone().sub(p0);

			// Pour chaque segment de la courbe de hermite
			for (let i = 0; i <= lengthDivisions; ++i) {
				let t = i / lengthDivisions;
				// Rayon pour ce segment de Hermite
				let radius = THREE.MathUtils.lerp(a0, a1, t);
				// On obtient la position et la tangente sur la courbe d'hermite au temps t et t + dt
				let [pt, vt] = this.hermite(h0, h1, v0, v1, t);

				// On crée les points autour du segment d'hermite
				let section = [];
				for (let j = 0; j < radialDivisions; ++j) {
					let angle = (j / radialDivisions) * Math.PI * 2;
					let point = new THREE.Vector3(radius * Math.cos(angle), 0, radius * Math.sin(angle));
					// On applique la movingFrame au point
					point.applyMatrix4(movingFrame).add(pt);
					section.push(point);
				}
				if (i < lengthDivisions) {
					// On multiplie notre movingFrame
					let tdt = t + 1 / lengthDivisions;
					let [ptdt, vtdt] = this.hermite(h0, h1, v0, v1, tdt);
					let [axis, angle] = this.findRotation(vt, vtdt);
					let rotationMatrix = new THREE.Matrix4().makeRotationAxis(axis, angle);
					movingFrame.multiply(rotationMatrix);
				}
				// On ajoute cette section au noeud
				rootNode.sections.push(section);
			}

			// On applique la fonction pour tous les noeuds récursivement
			for (let child of childNode)
				processNode(child, movingFrame.clone());
		}

		processNode(rootNode, new THREE.Matrix4())

		return rootNode;
	},

	hermite: function (h0, h1, v0, v1, t) {
		// On trouve les points de Bézier avec la matrice de l'énoncé
		// 1/3 * (3h0 + 0h1 + 0v0 + 0v1) = 1/3 * 3h0 = h0
		let p0 = h0.clone();
		// 1/3 * (3h0 + 0h1 + 1v0 + 0v1) = 1/3 * 3h0 + 1/3 * v0 = h0 + 1/3 * v0
		let p1 = h0.clone().add(v0.clone().multiplyScalar(1 / 3));
		// 1/3 * (0h0 + 3h1 + 0v0 - 1v1) = 1/3 * 3h1 + 1/3 * -v0 = h1 - 1/3 * v1
		let p2 = h1.clone().sub(v1.clone().multiplyScalar(1 / 3));
		// 1/3 * (0h0 + 3h1 + 0v0 + 0v1) = 1/3 * 3h1 = h1
		let p3 = h1.clone();

		// On défini une fonction qui permet de trouver le point entre deux vecteurs avec t
		let findT = (a, b, t) => a.clone().lerp(b, t);
		// On applique l'algorithme De Casteljau
		// Première itération
		let p0_1 = findT(p0, p1, t);
		let p1_1 = findT(p1, p2, t);
		let p2_1 = findT(p2, p3, t);
		// Seconde itération
		let p0_2 = findT(p0_1, p1_1, t);
		let p1_2 = findT(p1_1, p2_1, t);
		// Position finale
		let p = findT(p0_2, p1_2, t);

		// On trouve la tangente normalisée au point
		let dp = p1_2.clone().sub(p0_2).normalize();

		return [p, dp];

	},


	// Trouver l'axe et l'angle de rotation entre deux vecteurs
	findRotation: function (a, b) {
		const axis = new THREE.Vector3().crossVectors(a, b).normalize();
		var c = a.dot(b) / (a.length() * b.length());

		if (c < -1) {
			c = -1;
		} else if (c > 1) {
			c = 1;
		}

		const angle = Math.acos(c);

		return [axis, angle];
	},

	// Projeter un vecter a sur b
	project: function (a, b) {
		return b.clone().multiplyScalar(a.dot(b) / (b.lengthSq()));
	},

	// Trouver le vecteur moyen d'une liste de vecteurs
	meanPoint: function (points) {
		var mp = new THREE.Vector3();

		for (var i = 0; i < points.length; i++) {
			mp.add(points[i]);
		}

		return mp.divideScalar(points.length);
	},
};