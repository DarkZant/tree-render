# Tree Render
Tree scenes made with splines and meshes.

First the nodes of the tree are simplified, then we create splines that follow the branches.  
We then divide the splines and create points according to the length and radius of the branch.  
Finally, we create triangles connecting these points to create a mesh for the render.  
There is also an animation of the tree's skeleton with wind and gravity applied to the branches.

The [three.js](https://threejs.org/) library is used for rendering the scene.  
This project was made for the [IFT3355](https://admission.umontreal.ca/cours-et-horaires/cours/ift-3355/) UdeM course.
