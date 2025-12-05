import { Layer, project32, picking } from '@deck.gl/core';
import { Model, Geometry } from '@luma.gl/engine';

// Vertex shader for squares
const vs = `#version 300 es
  in vec3 positions;
  in vec3 instancePositions;
  in vec3 instancePositions64Low;
  in float instanceSizes;
  in vec4 instanceColors;
  in vec3 instancePickingColors;

  out vec4 vColor;

  void main() {
    // Scale the unit square by instance size
    // project_size converts from common space to pixels
    vec3 offset = positions * instanceSizes / 100.0;

    geometry.worldPosition = instancePositions;
    geometry.pickingColor = instancePickingColors;

    gl_Position = project_position_to_clipspace(
      instancePositions,
      instancePositions64Low,
      offset,
      geometry.position
    );

    DECKGL_FILTER_GL_POSITION(gl_Position, geometry);

    // Colors come as 0-255, convert to 0-1
    vColor = vec4(instanceColors.rgb / 255.0, instanceColors.a / 255.0);
    DECKGL_FILTER_COLOR(vColor, geometry);
  }
`;

// Fragment shader for squares
const fs = `#version 300 es
  precision highp float;

  in vec4 vColor;
  out vec4 fragColor;

  void main() {
    fragColor = vColor;
  }
`;

// Default props for the layer
const defaultProps = {
  // Data accessors
  getPosition: { type: 'accessor', value: d => d.position },
  getSize: { type: 'accessor', value: 30 },
  getColor: { type: 'accessor', value: [255, 0, 0, 255] }
};

export default class SquareLayer extends Layer {
  static layerName = 'SquareLayer';
  static defaultProps = defaultProps;

  getShaders() {
    return super.getShaders({
      vs,
      fs,
      modules: [project32, picking]
    });
  }

  initializeState() {
    const attributeManager = this.getAttributeManager();

    // Define instance attributes
    attributeManager.addInstanced({
      instancePositions: {
        size: 3,
        type: 'float64',
        fp64: this.use64bitPositions(),
        transition: true,
        accessor: 'getPosition'
      },
      instanceSizes: {
        size: 1,
        transition: true,
        accessor: 'getSize',
        defaultValue: 30
      },
      instanceColors: {
        size: 4,
        transition: true,
        type: 'unorm8',
        accessor: 'getColor',
        defaultValue: [255, 0, 0, 255]
      }
    });

    // Create the model
    this.setState({ model: this._getModel() });
  }

  updateState(params) {
    super.updateState(params);

    if (params.changeFlags.extensionsChanged) {
      this.state.model?.destroy();
      this.setState({ model: this._getModel() });
      this.getAttributeManager().invalidateAll();
    }
  }

  draw(params) {
    const { model } = this.state;
    if (!model) return;

    // Set the instance count - required for instanced rendering
    const numInstances = this.getNumInstances();
    model.instanceCount = numInstances;

    // Bind instance attribute buffers
    const attributes = this.getAttributeManager().getAttributes();
    const buffers = {};
    for (const attributeName in attributes) {
      const attribute = attributes[attributeName];
      if (attribute.getBuffer()) {
        buffers[attributeName] = attribute.getBuffer();
      }
    }
    model.setAttributes(buffers);

    // Set the shader inputs from the layer's context
    model.shaderInputs.setProps(this.context.shaderInputs?.moduleProps || {});
    model.draw(this.context.renderPass);
  }

  _getModel() {
    // Create a unit square geometry (will be scaled by instanceSize)
    // Square vertices: 4 corners
    const positions = new Float32Array([
      -0.5, -0.5, 0,
       0.5, -0.5, 0,
       0.5,  0.5, 0,
      -0.5,  0.5, 0
    ]);

    // Two triangles to form a square
    const indices = new Uint16Array([
      0, 1, 2,
      0, 2, 3
    ]);

    const geometry = new Geometry({
      topology: 'triangle-list',
      attributes: {
        positions: { size: 3, value: positions }
      },
      indices
    });

    const shaders = this.getShaders();

    return new Model(this.context.device, {
      ...shaders,
      id: this.props.id,
      geometry,
      isInstanced: true,
      bufferLayout: this.getAttributeManager().getBufferLayouts(),
      shaderInputs: this.context.shaderInputs
    });
  }
}
