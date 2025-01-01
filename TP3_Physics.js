const appleMass = 0.075;

TP3.Physics = {
	initTree: function (rootNode) {

		this.computeTreeMass(rootNode);

		var stack = [];
		stack.push(rootNode);

		while (stack.length > 0) {
			var currentNode = stack.pop();
			for (var i = 0; i < currentNode.childNode.length; i++) {
				stack.push(currentNode.childNode[i]);
			}

			currentNode.vel = new THREE.Vector3();
			currentNode.strength = currentNode.a0;
		}
	},

	computeTreeMass: function (node) {
		var mass = 0;

		for (var i = 0; i < node.childNode.length; i++) {
			mass += this.computeTreeMass(node.childNode[i]);
		}
		mass += node.a1;
		// Modifié pour qu'on regarde si le noeud a des index de pomme, indiquant qu'il y a une pomme sur la branche
		if (node.appleIndexes.length !== 0) {
			mass += appleMass;
		}
		node.mass = mass;

		return mass;
	},

	applyForces: function (node, dt, time) {

		var u = Math.sin(1 * time) * 4;
		u += Math.sin(2.5 * time) * 2;
		u += Math.sin(5 * time) * 0.4;

		var v = Math.cos(1 * time + 56485) * 4;
		v += Math.cos(2.5 * time + 56485) * 2;
		v += Math.cos(5 * time + 56485) * 0.4;

		// Ajouter le vent
		node.vel.add(new THREE.Vector3(u / Math.sqrt(node.mass), 0, v / Math.sqrt(node.mass)).multiplyScalar(dt));
		// Ajouter la gravite
		node.vel.add(new THREE.Vector3(0, -node.mass, 0).multiplyScalar(dt));

		// On initialise la direction statique de la branche si elle ne l'est pas
		if (node.initialDirection == null)
			node.initialDirection = node.p1.clone().sub(node.p0).normalize();

		let p0_ini = node.p0;
		let p1_ini = node.p1;

		// Si on n'est pas la racine, on attache notre noeud au parent
		if (node.parentNode != null)
			node.p0 = node.parentNode.p1.clone();

		// On traite la physique d'une manière différente pour les noeuds terminaux
		if (node.childNode.length === 0) {
			let branchLength = node.initialDirection.length() / 4;
			node.p1 = node.p0.clone().add(node.initialDirection.clone().multiplyScalar(branchLength));
			this.calculateTransformationMatrix(node, p0_ini, p1_ini);
			return;
		}

		// On trouve p1_(t + dt)
		let p1_tdt = node.p1.clone().add(node.vel.clone().multiplyScalar(dt));

		// On trouve la matrice de rotation
		let newDirection = p1_tdt.clone().sub(node.p0).normalize();
		let currentDirection = node.p1.clone().sub(node.p0).normalize();
		let [axis, angle] = TP3.Geometry.findRotation(newDirection, currentDirection);
		let rotationMatrix = new THREE.Matrix4().makeRotationAxis(axis, angle);
		let projectedP1 = node.p1.clone().applyMatrix4(rotationMatrix);
		let realVel = projectedP1.clone().sub(node.p1);

		// On met à jour notre point projeté et la vrai vélocité
		node.p1 = projectedP1;
		node.vel = realVel;

		// On calcule et on applique la force de restitution sur la vélocité
		currentDirection = projectedP1.clone().sub(node.p0).normalize();
		[axis, angle] = TP3.Geometry.findRotation(currentDirection, node.initialDirection);
		let restitutionForce = node.initialDirection.clone().multiplyScalar(angle * angle * node.a0 * 1000);
		node.vel.sub(restitutionForce);

		// On applique le facteur d'ammortissement sur la vélocité
		node.vel.multiplyScalar(0.7);

		this.calculateTransformationMatrix(node, p0_ini, p1_ini);

		// On exécute les forces récursivement sur les enfants
		for (let child of node.childNode) {
			this.applyForces(child, dt, time);
		}
	},

	calculateTransformationMatrix: function (node, p0_ini, p1_ini) {
		// On trouve les vecteurs de direction
		let initialDirection = p1_ini.clone().sub(p0_ini).normalize();
		let newDirection = node.p1.clone().sub(node.p0).normalize();

		// On trouve la rotation
		let [axis, angle] = TP3.Geometry.findRotation(newDirection, initialDirection);
		let rotationMatrix = new THREE.Matrix4().makeRotationAxis(axis, angle);

		// On trouve les translation et on les combine
		let translationp0 = node.p0.clone().sub(p0_ini);
		let translationMatrixp0 = new THREE.Matrix4().makeTranslation(
			translationp0.x, translationp0.y, translationp0.z
		);
		let translationp1 = node.p1.clone().sub(p1_ini);
		let translationMatrixp1 = new THREE.Matrix4().makeTranslation(
			translationp1.x, translationp1.y, translationp1.z
		);
		let translationMatrix = translationMatrixp0.multiply(translationMatrixp1);

		// On combine la rotation et la translation
		let transformationMatrix = new THREE.Matrix4();
		transformationMatrix.multiply(translationMatrix).multiply(rotationMatrix);

		node.animationMatrix = transformationMatrix;
	}
}