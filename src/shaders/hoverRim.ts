import type { MeshStandardMaterial } from 'three'

export type RimUniform = { value: number }

// onBeforeCompile дополняет PBR-материал: сохраняет HDRI, roughness и metalness.
// ShaderMaterial потребовал бы написать и поддерживать всё PBR-освещение заново.
export function attachHoverRim(material: MeshStandardMaterial): RimUniform {
  const strength = { value: 0 }

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRimStrength = strength
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
// Передаём нормаль поверхности во фрагментный шейдер в координатах камеры.
varying vec3 vRimNormal;
// Передаём направление от вершины к камере в той же системе координат.
varying vec3 vRimView;`,
      )
      .replace(
        '#include <defaultnormal_vertex>',
        `#include <defaultnormal_vertex>
// Three.js уже учёл normalMatrix: остаётся нормализовать вектор.
vRimNormal = normalize(transformedNormal);`,
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
// Камера находится в начале view-space, поэтому направление равно -позиции.
vRimView = -mvPosition.xyz;`,
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
// Uniform меняется без пересоздания материала и повторной компиляции GLSL.
uniform float uRimStrength;
// Интерполированная нормаль, полученная из vertex shader.
varying vec3 vRimNormal;
// Интерполированное направление на камеру, полученное из vertex shader.
varying vec3 vRimView;`,
      )
      .replace(
        '#include <opaque_fragment>',
        `// Dot равен 1 спереди и 0 на силуэте; clamp ограничивает результат.
float rimFacing = clamp(dot(normalize(vRimNormal), normalize(vRimView)), 0.0, 1.0);
// Инверсия выделяет край, степень 3 делает световую кайму узкой.
float rim = pow(1.0 - rimFacing, 3.0);
// Добавляем мягкий голубой свет перед стандартным tone mapping Three.js.
outgoingLight += vec3(0.48, 0.70, 0.88) * rim * uRimStrength;
// Сохраняем стандартные прозрачность и вывод цвета PBR-материала.
#include <opaque_fragment>`,
      )
  }

  // Все экземпляры используют одну GPU-программу, но отдельные uniforms.
  material.customProgramCacheKey = () => 'forma-hover-rim-v1'
  return strength
}
