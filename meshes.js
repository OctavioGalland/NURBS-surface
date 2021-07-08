const cubeMesh = [
  // Vertex        Normal
  // Front
   1, -1,  1,      0,  0,  1,
   1,  1,  1,      0,  0,  1,
  -1, -1,  1,      0,  0,  1,
   1,  1,  1,      0,  0,  1,
  -1,  1,  1,      0,  0,  1,
  -1, -1,  1,      0,  0,  1,
  
  // Back
   1,  1, -1,      0,  0, -1,
   1, -1, -1,      0,  0, -1,
  -1,  1, -1,      0,  0, -1,
   1, -1, -1,      0,  0, -1,
  -1, -1, -1,      0,  0, -1,
  -1,  1, -1,      0,  0, -1,
  
  // Bottom
  -1, -1, -1,      0, -1,  0,
   1, -1, -1,      0, -1,  0,
  -1, -1,  1,      0, -1,  0,
   1, -1, -1,      0, -1,  0,
   1, -1,  1,      0, -1,  0,
  -1, -1,  1,      0, -1,  0,
  
  // Top
  -1,  1, -1,      0,  1,  0,
  -1,  1,  1,      0,  1,  0,
   1,  1, -1,      0,  1,  0,
  -1,  1,  1,      0,  1,  0,
   1,  1,  1,      0,  1,  0,
   1,  1, -1,      0,  1,  0,
  
  // Left
  -1,  1,  1,     -1,  0,  0,
  -1,  1, -1,     -1,  0,  0,
  -1, -1,  1,     -1,  0,  0,
  -1,  1, -1,     -1,  0,  0,
  -1, -1, -1,     -1,  0,  0,
  -1, -1,  1,     -1,  0,  0,
  
  // Right
   1,  1,  1,      1,  0,  0,
   1, -1,  1,      1,  0,  0,
   1,  1, -1,      1,  0,  0,
   1, -1,  1,      1,  0,  0,
   1, -1, -1,      1,  0,  0,
   1,  1, -1,      1,  0,  0
];
