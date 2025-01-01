function createWorld(scene) {
	const light = new THREE.DirectionalLight( 0xffffff, 1);
	light.position.set( 3, 10, -7.5 );
	light.castShadow = true;
	light.shadow.camera = new THREE.OrthographicCamera( -5, 5, 5, -5, 0.5, 50 );
	light.shadow.bias = -0.0001;
	light.shadow.mapSize.width = 2048;
	light.shadow.mapSize.height = 2048;
	scene.add(light);

	let c = new THREE.CameraHelper(light.shadow.camera)
	// scene.add(c);

	// Skybox
	let loader = new THREE.CubeTextureLoader();
	scene.background = loader.load([
		'Images/Skybox/px.png', // +X
		'Images/Skybox/nx.png', // -X
		'Images/Skybox/py.png', // +Y
		'Images/Skybox/ny.png', // -Y
		'Images/Skybox/pz.png', // +Z
		'Images/Skybox/nz.png'  // -Z
	]);

	const alight = new THREE.AmbientLight( 0x404040 );
	scene.add(alight);

	const hlight = new THREE.HemisphereLight( 0xffffbb, 0x080820, 0.5 );
	scene.add(hlight);
	
	var planegeometry = new THREE.PlaneGeometry(2000, 2000);
	planegeometry.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
	// Grass texture
	var floorTexture = new THREE.ImageUtils.loadTexture('Images/Grass.jpg');
	floorTexture.wrapS = floorTexture.wrapT = THREE.MirroredRepeatWrapping;
	floorTexture.repeat.set(192, 192);
	var floorMaterial = new THREE.MeshLambertMaterial({ map: floorTexture, side: THREE.DoubleSide });

	var planemesh = new THREE.Mesh(planegeometry, floorMaterial);
	planemesh.castShadow = true;
	planemesh.receiveShadow = true;
	scene.add(planemesh);
}

// renderer.setClearColor( 0x87CEEB, 1 );
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.enabled = true;

createWorld(scene);

camera.position.y = 2;
camera.position.z = 8;
controls.target.y = 2;
controls.maxPolarAngle=Math.PI/2;
controls.update();