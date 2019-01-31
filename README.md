<p align="center">
  <img alt="WebComp" title="WebComp" src="https://blobscdn.gitbook.com/v0/b/gitbook-28427.appspot.com/o/assets%2F-LW1jjJ35Z5Vk0rHU3sY%2F-LW1kKgwYkfICzANpIJn%2F-LW1kmXebxo0HDcL5J4j%2Flogo.svg?alt=media&token=fd45b300-38df-4e3b-9af3-0aa0d3821023" width="358">
</p>

WebComp.js is a "batteries included" JavaScript library for writing smart reusable [Web Components](https://www.webcomponents.org/introduction) in a modern way.

Inspired by React components, WebComp provides familiar state management mechanisms and Virtual DOM, while also providing all of the sweetness of Web Components like Shadow DOM, server side rendering placeholders and ability to render from a string.

## Features

* JSX
* React-like syntax
* Virtual DOM
* Shadow DOM
* Component and element lifecycle hooks
* Attribute to props mapping
* Event based communication
* State sharing (context)
* Routing
* Tiny bundle size

## Getting Started

### 1. Install WebComp

```bash
npm install @webcomp/core
```

### 2. Import WebComp

```js
import { WebComponent, register } from '@webcomp/core';
```

### 3. Create your component

```jsx
class SuperHeader extends WebComponent {
  render(props) {
    return (
      <div>
        <h1>{props.text}</h1>
        <h3>It's Superpowered!</h3>
      </div>
   );
  }
}
```

Looks familiar? WebComp components are written in the exact same way as React components.

_**Note:** Because WebComp uses Preact for rendering JSX, `props` and `state` are passed as arguments to the `render()` method for convenient destructuring. You can still use `this.props` and `this.state` if you want to, but it's not required._

### 4. Register your custom tag

```js
register(SuperHeader, 'super-header');
```

Second argument is an optional tag name. If not set, component name converted to dash-case will be used.

### 5. Use it!

```html
<div id="main">
  <super-header text="This is not a simple header!"></super-header>
</div>
```

## Documentation

You can read the full documentation [here →](https://webcomp.gitbook.io)

