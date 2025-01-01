TP3.Render = {

	branchMaterialS: new THREE.MeshLambertMaterial({ color: 0x8B5A2B, wireframe: false }),
	branchMaterial: new THREE.MeshLambertMaterial({ map: new THREE.ImageUtils.loadTexture('Images/Wood.jpg') }),
	leafMaterialS: new THREE.MeshPhongMaterial({ color: 0x3A5F0B, side: THREE.DoubleSide }),
	leafMaterial: new THREE.MeshPhongMaterial({ map: new THREE.ImageUtils.loadTexture('Images/Leaves.png'), side: THREE.DoubleSide }),
	appleMaterialS: new THREE.MeshPhongMaterial({ color: 0x5F0B0B }),
	appleMaterial: new THREE.MeshPhongMaterial({ map: new THREE.ImageUtils.loadTexture('Images/Apple.jpg') }),

	tbgu: THREE.BufferGeometryUtils,

	drawTreeRough: function (rootNode, scene, alpha, radialDivisions = 8, leavesCutoff = 0.1, leavesDensity = 10, applesProbability = 0.05, matrix = new THREE.Matrix4()) {
		// Listes pour stocker nos géométries
		let branchGeometries = [];
		let leafGeometries = [];
		let appleGeometries = [];

		// Fonction récursive qui traverse tous les noeuds de l'arbre
		function processNode(node, transformMatrix) {
			let { p0, p1, a0, a1, childNode } = node;

			// On crée la branche
			let vec = p1.clone().sub(p0);
			let height = vec.length();
			let direction = vec.normalize();
			// On trouve la rotation de la branche selon sa direction
			let quaternion = new THREE.Quaternion().setFromUnitVectors(
				new THREE.Vector3(0, 1, 0),
				direction
			);
			let rotation = new THREE.Matrix4().makeRotationFromQuaternion(quaternion);
			// On trouve la position de la branche en utilisant son début et sa fin
			let translation = new THREE.Matrix4().makeTranslation(
				(p0.x + p1.x) / 2,
				(p0.y + p1.y) / 2,
				(p0.z + p1.z) / 2
			);

			let branchGeometry = new THREE.CylinderBufferGeometry(a1, a0, height, radialDivisions);
			branchGeometry.applyMatrix4(rotation).applyMatrix4(translation).applyMatrix4(transformMatrix);
			branchGeometries.push(branchGeometry);

			// On ajoute des feuilles et des pommes si notre branche est assez petite
			if (a0 < alpha * leavesCutoff) {
				for (let i = 0; i < leavesDensity; i++) {
					let leafGeometry = new THREE.PlaneBufferGeometry(alpha, alpha);
					// Si la branche est terminale, on rajoute alpha à la longueur
					let length = Math.random() * (height + (childNode.length === 0 ? alpha : 0));
					let randomMatrix = TP3.Render.getRandomMatrix(alpha, direction, length, p0);
					leafGeometry.applyMatrix4(randomMatrix.multiply(transformMatrix));
					leafGeometries.push(leafGeometry);
				}
				// On ajoute une pomme avec notre probabilité
				if (Math.random() < applesProbability) {
					let appleGeometry = new THREE.BoxBufferGeometry(alpha, alpha, alpha);
					// On met la pomme aléatoirement sur la longueur de la branche
					// (les pommes ne dépassent pas de la branche car ce n'est pas logique physiquement)
					let length = Math.random() * height;
					let position = p0.clone().addScaledVector(direction, length);
					// On descend un peu la pomme pour qu'elle pende
					let translation = new THREE.Matrix4().makeTranslation(
						position.x,
						position.y - 0.1,
						position.z
					);
					appleGeometry.applyMatrix4(translation);
					appleGeometries.push(appleGeometry);
				}
			}
			// On applique la fonction récursivement sur les enfants
			for (let child of childNode) {
				processNode(child, transformMatrix);
			}
		}

		// On commence la récursion avec le tronc de l'arbre
		processNode(rootNode, matrix);
		// On combine les géométries pour accélérer le rendu de la scène
		let combinedBranches = this.tbgu.mergeBufferGeometries(branchGeometries, true);
		let combinedLeaves = this.tbgu.mergeBufferGeometries(leafGeometries, true);
		let combinedApples = this.tbgu.mergeBufferGeometries(appleGeometries, true);
		// On crée les maillages
		let branchMesh = new THREE.Mesh(combinedBranches, this.branchMaterial);
		branchMesh.castShadow = true;
		branchMesh.receiveShadow = true;
		let leavesMesh = new THREE.Mesh(combinedLeaves, this.leafMaterial);
		leavesMesh.castShadow = true;
		leavesMesh.receiveShadow = true;
		let applesMesh = new THREE.Mesh(combinedApples, this.appleMaterial);
		applesMesh.castShadow = true;
		applesMesh.receiveShadow = true;
		// On les ajoute les maillages à la scène
		scene.add(branchMesh);
		scene.add(leavesMesh);
		scene.add(applesMesh);
	},

	// Fonction qui nous permet d'obtenir une matrice de rotation et de position aléatoire autour de la branche
	// pour une feuille
	getRandomMatrix: function(alpha, direction, length, p0) {
		// On applique une translation aléatoire autour de la branche à la feuille
		let radialOffset = new THREE.Vector3(
			(Math.random() - 0.5) * alpha,
			(Math.random() - 0.5) * alpha,
			(Math.random() - 0.5) * alpha
		);
		radialOffset.projectOnPlane(direction);

		let position = p0.clone() // Début de la branche
			.addScaledVector(direction, length) // Position aléatoire sur la longueur de la branche
			.add(radialOffset); // Position aléatoire autour de la branche

		let randomOffset = new THREE.Matrix4().makeTranslation(
			position.x,
			position.y,
			position.z
		);
		// On applique une rotation aléatoire à la feuille
		let randomRotation = new THREE.Matrix4()
			.makeRotationX(Math.random() * Math.PI * 2)
			.multiply(new THREE.Matrix4().makeRotationY(Math.random() * Math.PI * 2))
			.multiply(new THREE.Matrix4().makeRotationZ(Math.random() * Math.PI * 2));

		let finalMatrix = new THREE.Matrix4().multiply(randomOffset);
		finalMatrix.multiply(randomRotation);
		return finalMatrix;
	},

	drawTreeHermite: function (rootNode, scene, alpha, leavesCutoff = 0.1, leavesDensity = 10, applesProbability = 0.05, matrix = new THREE.Matrix4()) {

		// Listes pour stocker les données de maillage
		let branchVertices = [];
		let branchIndices = [];
		let leafVertices = [];
		let leafIndices = [];
		let appleVertices = [];
		let appleIndices = [];
		let appleUVs = [];

		let branchIndexOffset = 0;
		let leafIndexOffset = 0;
		let appleIndexOffset = 0;

		// On ferme le tronc
		let basePoints = rootNode.sections[0];
		let middleRoot = TP3.Geometry.meanPoint(basePoints);
		branchVertices.push(middleRoot.x, middleRoot.y, middleRoot.z);
		let radialDivisions = basePoints.length;
		let middleIndex = 0;
		for (let i = 1; i < radialDivisions + 1; ++i) {
			let outerLeft = i;
			let outerRight = i + 1;
			if (outerRight === radialDivisions + 1)
				outerRight = 1;

			branchIndices.push(outerRight, middleIndex, outerLeft);
		}
		branchIndexOffset += 1;

		let drawNode = (node, transformMatrix) => {
			let { p0, p1, a0, childNode } = node;

			// Maillage des branches
			let sections = node.sections;
			let radialDivisions = sections[0].length;
			let lengthDivisions = sections.length;

			for (let i = 0; i < lengthDivisions; i++) {
				let currentSection = sections[i];

				for (let j = 0; j < radialDivisions; j++) {
					let bottomLeft = branchIndexOffset + j;
					let bottomRight = branchIndexOffset + (j + 1) % radialDivisions;

					let topLeft = branchIndexOffset + radialDivisions + j;
					let topRight = branchIndexOffset + radialDivisions + (j + 1) % radialDivisions;

					// Deux triangles pour chaque face entre les sections
					if (i < lengthDivisions - 1) {
						// Triangle en bas à gauche
						branchIndices.push(bottomLeft, topLeft, bottomRight);
						// Triangle en haut à droite
						branchIndices.push(bottomRight, topLeft, topRight);
					}
				}
				// Ajout des vertices de section à la liste
				for (let point of currentSection) {
					branchVertices.push(point.x, point.y, point.z);
					node.branchPoints.push(point);
				}
				branchIndexOffset += radialDivisions;
			}

			// Pour les branches terminales
			if (childNode.length === 0) {
				let lastPoints = sections[lengthDivisions - 1];
				//Ajouter les derniers points
				for (let point of lastPoints) {
					branchVertices.push(point.x, point.y, point.z);
					node.branchPoints.push(point);
				}

				let middle = TP3.Geometry.meanPoint(lastPoints);
				branchVertices.push(middle.x, middle.y, middle.z);
				node.branchPoints.push(middle);
				let middleIndex = branchIndexOffset;
				for (let i = 0; i < radialDivisions; ++i) {
					let outerLeft = branchIndexOffset + i;
					let outerRight = branchIndexOffset + (i + 1);
					if (i === radialDivisions - 1)
						outerRight = branchIndexOffset;
					branchIndices.push(outerLeft, middleIndex, outerRight);
				}
				branchIndexOffset += 1;
			}
			else {
				let firstChildPoints = childNode[0].sections[0];

				for (let j = 0; j < radialDivisions; j++) {
					let bottomLeft = branchIndexOffset - radialDivisions + j;
					let bottomRight = branchIndexOffset - radialDivisions + (j + 1) % radialDivisions;

					let topLeft = branchIndexOffset + j;
					let topRight = branchIndexOffset + (j + 1) % radialDivisions;

					// Deux triangles pour chaque face entre les sections
					branchIndices.push(bottomLeft, topLeft, bottomRight);
					branchIndices.push(bottomRight, topLeft, topRight);
				}

				for (let point of firstChildPoints) {
					branchVertices.push(point.x, point.y, point.z);
					node.branchPoints.push(point);
				}
			}
			branchIndexOffset += radialDivisions;



			// On ajoute des feuilles et des pommes si notre branche est assez petite
			if (a0 < alpha * leavesCutoff) {
				let vec = p1.clone().sub(p0);
				let height = vec.length();
				let direction = vec.normalize();

				for (let i = 0; i < leavesDensity; i++) {
					let v1 = new THREE.Vector3(alpha/2, 0, 0);
					let v2 = new THREE.Vector3(0, alpha * Math.sqrt(3) / 2, 0);
					let v3 = new THREE.Vector3(-alpha/2, 0, 0);
					let length = Math.random() * (height + (childNode.length === 0 ? alpha : 0));
					let randomMatrix = TP3.Render.getRandomMatrix(alpha, direction, length, p0);
					v1.applyMatrix4(randomMatrix);
					v2.applyMatrix4(randomMatrix);
					v3.applyMatrix4(randomMatrix);
					leafVertices.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z);
					node.leafPoints.push(v1, v2, v3);

					leafIndices.push(leafIndexOffset, leafIndexOffset + 1, leafIndexOffset + 2);
					node.leafIndexes.push(leafIndexOffset, leafIndexOffset + 1, leafIndexOffset + 2);
					leafIndexOffset += 3;
				}

				// Maillage des pommes
				if (Math.random() < applesProbability) {
					// Les pommes sont un peu low-poly pour aider avec la performance
					let appleGeometry = new THREE.SphereBufferGeometry(alpha / 2, 16, 8);
					let length = Math.random() * height;
					// On prend une position aléatoire sur le long de la branche
					// (les pommes ne dépassent pas de la branche car ce n'est pas logique physiquement)
					let position = p0.clone().addScaledVector(direction, length);
					// On descend un peu la pomme pour qu'elle pende de la branche
					let translation = new THREE.Matrix4().makeTranslation(
						position.x,
						position.y - 0.1,
						position.z
					);
					appleGeometry.applyMatrix4(translation);
					// On trouve ses points et ses indices
					let applePts = appleGeometry.getAttribute('position').array;
					let appleIndex = appleGeometry.getIndex().array;

					for (let i = 0; i < applePts.length; i++) {
						appleVertices.push(applePts[i]);
						if (i % 3 === 0)
							node.applePoints.push(new THREE.Vector3(applePts[i], applePts[i + 1], applePts[i + 2]))
					}
					for (let i = 0; i < appleIndex.length; i++) {
						appleIndices.push(appleIndexOffset + appleIndex[i]);
						node.appleIndexes.push(appleIndexOffset + appleIndex[i]);
					}
					appleIndexOffset += applePts.length / 3;

					let sphereUVs = appleGeometry.getAttribute('uv').array;

					// Copy UVs to appleUVs
					for (let i = 0; i < sphereUVs.length; i++) {
						appleUVs.push(sphereUVs[i]);
					}
				}
			}

			// On appelle la fonction récursivement pour tous les enfants
			for (let child of node.childNode) {
				drawNode(child, transformMatrix);
			}
		};

		drawNode(rootNode, matrix);

		let branchUVs = [];

		// Example UV calculation for branch vertices
		for (let i = 0; i < branchVertices.length; i += 3) {
			let x = branchVertices[i];
			let y = branchVertices[i + 1];
			let z = branchVertices[i + 2];

			// Assuming the branch is along the Y-axis
			let angle = Math.atan2(z, x); // Angle around Y-axis
			let u = (angle / (2 * Math.PI)) + 0.5; // Normalize to [0, 1]
			let v = (y - 0.5) / (1 - 0.5); // Normalize height to [0, 1]

			branchUVs.push(u, v);
		}

		let leafUVs = [];

		// Assuming each leaf is an equilateral triangle
		for (let i = 0; i < leafVertices.length / 9; i++) { // Each leaf has 3 vertices (9 floats)
			leafUVs.push(0.5, 1); // Top vertex
			leafUVs.push(0, 0);   // Bottom-left vertex
			leafUVs.push(1, 0);   // Bottom-right vertex
		}




		// On crée le BufferGeometry des branches et on l'ajoute à la scène
		let branchGeometry = new THREE.BufferGeometry();
		branchGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(branchVertices), 3));
		branchGeometry.setIndex(branchIndices);
		branchGeometry = THREE.BufferGeometryUtils.mergeVertices(branchGeometry);
		branchGeometry.computeVertexNormals();
		branchGeometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(branchUVs), 2));
		let branchMesh = new THREE.Mesh(branchGeometry, this.branchMaterialS);
		branchMesh.castShadow = true;
		branchMesh.receiveShadow = true;
		scene.add(branchMesh);

		// On crée le BufferGeometry des feuilles et on l'ajoute à la scène
		let leafGeometry = new THREE.BufferGeometry();
		leafGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(leafVertices), 3));
		leafGeometry.setIndex(leafIndices);
		leafGeometry.computeVertexNormals();
		leafGeometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(leafUVs), 2));
		let leafMesh = new THREE.Mesh(leafGeometry, this.leafMaterial);
		leafMesh.castShadow = true;
		leafMesh.receiveShadow = true;
		scene.add(leafMesh);

		// On ajoute les pommes à la scène
		let appleGeometry = new THREE.BufferGeometry();
		appleGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(appleVertices), 3));
		appleGeometry.setIndex(appleIndices);
		appleGeometry.computeVertexNormals();
		appleGeometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(appleUVs), 2));
		let appleMesh = new THREE.Mesh(appleGeometry, this.appleMaterial);
		appleMesh.castShadow = true;
		appleMesh.receiveShadow = true;
		scene.add(appleMesh);

		return [branchGeometry, leafGeometry, appleGeometry]
	},

	updateTreeHermite: function (trunkGeometryBuffer, leavesGeometryBuffer, applesGeometryBuffer, rootNode) {
		let branchVertices = [];
		let leafVertices = [];
		let appleVertices = [];

		let updateNode = (node) => {
			for (let point of node.branchPoints) {
				point.applyMatrix4(node.animationMatrix);
				branchVertices.push(point.x, point.y, point.z);
			}
			for (let point of node.leafPoints) {
				point.applyMatrix4(node.animationMatrix);
				leafVertices.push(point.x, point.y, point.z);
			}
			for (let point of node.applePoints) {
				point.applyMatrix4(node.animationMatrix);
				appleVertices.push(point.x, point.y, point.z);
			}

			for (let child of node.childNode)
				updateNode(child);
		};

		updateNode(rootNode);

		trunkGeometryBuffer.setAttribute("position", new THREE.BufferAttribute(new Float32Array(branchVertices), 3));
		trunkGeometryBuffer = THREE.BufferGeometryUtils.mergeVertices(trunkGeometryBuffer);
		trunkGeometryBuffer.computeVertexNormals();

		leavesGeometryBuffer.setAttribute("position", new THREE.BufferAttribute(new Float32Array(leafVertices), 3));
		leavesGeometryBuffer.computeVertexNormals();

		applesGeometryBuffer.setAttribute("position", new THREE.BufferAttribute(new Float32Array(appleVertices), 3));
		applesGeometryBuffer.computeVertexNormals();

	},

	drawTreeSkeleton: function (rootNode, scene, color = 0xffffff, matrix = new THREE.Matrix4()) {

		var stack = [];
		stack.push(rootNode);

		var points = [];

		while (stack.length > 0) {
			var currentNode = stack.pop();

			for (var i = 0; i < currentNode.childNode.length; i++) {
				stack.push(currentNode.childNode[i]);
			}

			points.push(currentNode.p0);
			points.push(currentNode.p1);

		}

		var geometry = new THREE.BufferGeometry().setFromPoints(points);
		var material = new THREE.LineBasicMaterial({ color: color });
		var line = new THREE.LineSegments(geometry, material);
		line.applyMatrix4(matrix);
		scene.add(line);

		return line.geometry;
	},

	updateTreeSkeleton: function (geometryBuffer, rootNode) {

		var stack = [];
		stack.push(rootNode);

		var idx = 0;
		while (stack.length > 0) {
			var currentNode = stack.pop();

			for (var i = 0; i < currentNode.childNode.length; i++) {
				stack.push(currentNode.childNode[i]);
			}
			geometryBuffer[idx * 6] = currentNode.p0.x;
			geometryBuffer[idx * 6 + 1] = currentNode.p0.y;
			geometryBuffer[idx * 6 + 2] = currentNode.p0.z;
			geometryBuffer[idx * 6 + 3] = currentNode.p1.x;
			geometryBuffer[idx * 6 + 4] = currentNode.p1.y;
			geometryBuffer[idx * 6 + 5] = currentNode.p1.z;

			idx++;
		}
	},


	drawTreeNodes: function (rootNode, scene, color = 0x00ff00, size = 0.05, matrix = new THREE.Matrix4()) {

		var stack = [];
		stack.push(rootNode);

		var points = [];

		while (stack.length > 0) {
			var currentNode = stack.pop();

			for (var i = 0; i < currentNode.childNode.length; i++) {
				stack.push(currentNode.childNode[i]);
			}

			points.push(currentNode.p0);
			points.push(currentNode.p1);

		}

		var geometry = new THREE.BufferGeometry().setFromPoints(points);
		var material = new THREE.PointsMaterial({ color: color, size: size });
		var points = new THREE.Points(geometry, material);
		points.applyMatrix4(matrix);
		scene.add(points);

	},


	drawTreeSegments: function (rootNode, scene, lineColor = 0xff0000, segmentColor = 0xffffff, orientationColor = 0x00ff00, matrix = new THREE.Matrix4()) {

		var stack = [];
		stack.push(rootNode);

		var points = [];
		var pointsS = [];
		var pointsT = [];

		while (stack.length > 0) {
			var currentNode = stack.pop();

			for (var i = 0; i < currentNode.childNode.length; i++) {
				stack.push(currentNode.childNode[i]);
			}

			const segments = currentNode.sections;
			for (var i = 0; i < segments.length - 1; i++) {
				points.push(TP3.Geometry.meanPoint(segments[i]));
				points.push(TP3.Geometry.meanPoint(segments[i + 1]));
			}
			for (var i = 0; i < segments.length; i++) {
				pointsT.push(TP3.Geometry.meanPoint(segments[i]));
				pointsT.push(segments[i][0]);
			}

			for (var i = 0; i < segments.length; i++) {

				for (var j = 0; j < segments[i].length - 1; j++) {
					pointsS.push(segments[i][j]);
					pointsS.push(segments[i][j + 1]);
				}
				pointsS.push(segments[i][0]);
				pointsS.push(segments[i][segments[i].length - 1]);
			}
		}

		var geometry = new THREE.BufferGeometry().setFromPoints(points);
		var geometryS = new THREE.BufferGeometry().setFromPoints(pointsS);
		var geometryT = new THREE.BufferGeometry().setFromPoints(pointsT);

		var material = new THREE.LineBasicMaterial({ color: lineColor });
		var materialS = new THREE.LineBasicMaterial({ color: segmentColor });
		var materialT = new THREE.LineBasicMaterial({ color: orientationColor });

		var line = new THREE.LineSegments(geometry, material);
		var lineS = new THREE.LineSegments(geometryS, materialS);
		var lineT = new THREE.LineSegments(geometryT, materialT);

		line.applyMatrix4(matrix);
		lineS.applyMatrix4(matrix);
		lineT.applyMatrix4(matrix);

		scene.add(line);
		scene.add(lineS);
		scene.add(lineT);

	}
}