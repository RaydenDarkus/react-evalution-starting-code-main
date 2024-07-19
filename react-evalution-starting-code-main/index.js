const API = (() => {
  const URL = "http://localhost:3000";
  const getCart = () => {
    // define your method to get cart data
    return fetch(`${URL}/cart`).then((res) => res.json());
  };

  const getInventory = () => {
    // define your method to get inventory data
    return fetch(`${URL}/inventory`).then((res) => res.json());
  };

  const updateInventory = (id, newQuantity) => {
    return fetch(`${URL}/inventory/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ quantity: newQuantity }),
    }).then((res) => res.json());
  };


  const addToCart = (inventoryItem) => {
    // define your method to add an item to cart
    return fetch(`${URL}/cart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(inventoryItem),
    }).then((res) => res.json());
  };

  const updateCart = (id, newAmount) => {
    // define your method to update an item in cart
    return fetch(`${URL}/cart/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: newAmount }),
    }).then((res) => res.json());
  };

  const deleteFromCart = (id) => {
    // define your method to delete an item in cart
    return fetch(`${URL}/cart/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    }).then((res) => res.json());
  };

  const checkout = () => {
    // you don't need to add anything here
    return getCart().then((data) =>
      Promise.all(data.map((item) => deleteFromCart(item.id)))
    );
  };

  return {
    getCart,
    updateCart,
    getInventory,
    addToCart,
    deleteFromCart,
    checkout,
    updateInventory,
  };
})();

const Model = (() => {
  // implement your logic for Model
  class State {
    #onChange;
    #inventory;
    #cart;
    constructor() {
      this.#inventory = [];
      this.#cart = [];
    }
    get cart() {
      return this.#cart;
    }

    get inventory() {
      return this.#inventory;
    }

    set cart(newCart) {
      this.#cart = newCart;
      this.#onChange();
    }
    set inventory(newInventory) {
      this.#inventory = newInventory;
      this.#onChange();
    }

    subscribe(cb) {
      this.#onChange = cb;
    }
  }
  const {
    getCart,
    updateCart,
    getInventory,
    addToCart,
    deleteFromCart,
    checkout,
    updateInventory,
  } = API;
  return {
    State,
    getCart,
    updateCart,
    getInventory,
    addToCart,
    deleteFromCart,
    checkout,
    updateInventory,
  };
})();

const View = (() => {
  // implement your logic for View
  const inventoryItems = document.querySelector('.inventory-container ul');
  const cartItems = document.querySelector('.cart-wrapper ul');

  const renderInventory = (inventory) => {
    inventoryItems.innerHTML = '';
    inventory.forEach((item) => {
      const inventoryItem = `<li id=${item.id}>
      <span>${item.content}</span>
      <button class="subtract-btn">-</button>
      <span>${item.quantity}</span>
      <button class="add-btn">+</button>
      <button class="add-to-cart-btn">Add to Cart</button>
      </li>`
      inventoryItems.insertAdjacentHTML('beforeend', inventoryItem);
    });
  };

  const renderCart = (cart) => {
    cartItems.innerHTML = '';
    cart.forEach((item) => {
      const cartItem = `<li id=${item.id}>
      <span>${item.content}</span>
      <span> x ${item.amount}</span>
      <button class="delete-btn">Delete</button>
      </li>`
      cartItems.insertAdjacentHTML('beforeend', cartItem);
    });
  };

  return {
    renderInventory,
    renderCart,
  };
})();

const Controller = ((model, view) => {
  const state = new model.State();

  const init = () => {
    model.getInventory()
      .then(inventory => {
        state.inventory = inventory;
        view.renderInventory(inventory);
        return model.getCart();
      })
      .then(cart => {
        state.cart = cart;
        view.renderCart(cart);
      })
      .catch(error => console.error('Error initializing app:', error));
    
    state.subscribe(() => {
      view.renderInventory(state.inventory);
      view.renderCart(state.cart);
    });
    
    setupEventListeners();
  };

  const setupEventListeners = () => {
    document.querySelector('.inventory-container ul').addEventListener('click', (event) => {
      if (event.target.classList.contains('add-btn')) {
        handleUpdateAmount(event, 1);
      } else if (event.target.classList.contains('subtract-btn')) {
        handleUpdateAmount(event, -1);
      }
      else if (event.target.classList.contains('add-to-cart-btn')) {
        handleAddToCart(event);
      }
    });

    document.querySelector('.cart-wrapper ul').addEventListener('click', (event) => {
      if (event.target.classList.contains('delete-btn')) {
        handleDelete(event);
      }
    });

    document.querySelector('.checkout-btn').addEventListener('click', handleCheckout);
  };

  const handleUpdateAmount = (event, change) => {
    const li = event.target.closest('li');
    const id = parseInt(li.id, 10);
    const inventoryItem = state.inventory.find(item => item.id === id);
    
    if (inventoryItem) {
      const newQuantity = Math.max(0, inventoryItem.quantity + change);
      model.updateInventory(id, newQuantity)
        .then(() => model.getInventory())
        .then(newInventory => {
          state.inventory = newInventory;
        })
        .catch(error => console.error('Error updating inventory:', error));
    }
  };

  const handleAddToCart = (event) => {
    const li = event.target.closest('li');
    const id = parseInt(li.id, 10);
    const inventoryItem = state.inventory.find(item => item.id === id);
    
    if (inventoryItem) {
      const cartItem = state.cart.find(item => item.id === id);
      
      if (cartItem) {
        // If the item is already in the cart, update its amount
        const newAmount = cartItem.amount + inventoryItem.quantity;
        model.updateCart(id, newAmount)
          .then(() => model.getCart())
          .then(newCart => {
            state.cart = newCart;
          })
          .catch(error => console.error('Error updating cart:', error));
      } else if (inventoryItem.quantity > 0) {
        // If the item is not in the cart, add it
        model.addToCart({ id: inventoryItem.id, content: inventoryItem.content, amount: inventoryItem.quantity })
          .then(() => model.getCart())
          .then(newCart => {
            state.cart = newCart;
          })
          .catch(error => console.error('Error adding to cart:', error));
      }
    }
  };

  const handleDelete = (event) => {
    const li = event.target.closest('li');
    const id = li.id;

    model.deleteFromCart(id)
      .then(() => model.getCart())
      .then(newCart => {
        view.renderCart(newCart);
        state.cart = newCart; // Update state with new cart
      })
      .catch(error => console.error('Error deleting from cart:', error));
  };

  const handleCheckout = () => {
    model.checkout()
      .then(() => {
        view.renderCart([]); // Clear the cart view
        state.cart = []; // Update state
      })
      .catch(error => console.error('Error during checkout:', error));
  };

  const bootstrap = () => {
    init();
  };

  return {
    bootstrap,
  };

})(Model, View);

Controller.bootstrap();