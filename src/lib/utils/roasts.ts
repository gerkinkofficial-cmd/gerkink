// Rotating ego-roast messages used throughout the site
export const TICKER_ROASTS = [
  "Your outfit screams 'I gave up in 2019'",
  "We sell a $10,000,000 t-shirt. No, you can't afford it.",
  "Society Fuckers Collection — because mediocrity is expensive",
  "Your closet looks like a Goodwill reject pile",
  "Valueless Bitches — for people who know their worth",
  "Our owners are anonymous. Our wearers are unforgettable.",
  "You're reading this instead of fixing your wardrobe",
  "The cheapest shirt here costs more than your monthly rent",
  "We don't do sales. Your dignity isn't on discount.",
  "POV: you finally made a good decision",
  "Your friends lied to you. We won't.",
  "Fashion died. GERKINK is the autopsy.",
  "Basic is a choice. A bad one.",
  "You dress like your personality — which explains a lot.",
  "Every cheap shirt you own is a personal failure",
];

export const HOVER_ROASTS = [
  "You can't afford this. Close the tab.",
  "Bold choice for someone with your budget.",
  "Your bank account just had a panic attack.",
  "This costs more than your car. Worth it.",
  "You sure about that? Really sure?",
  "Society Fuckers only. Are you one?",
  "Your card is already crying.",
];

export const CART_ROASTS = [
  "Finally making a good decision for once.",
  "Your wardrobe needed this. Desperately.",
  "Look at you. Almost impressive.",
  "Cart updated. Dignity: +1.",
  "Added. Now don't you dare back out.",
];

export const EMPTY_CART_ROAST = "Empty cart. Empty life. Checks out.";

export const LOGIN_ROASTS = [
  "Back again? Your wardrobe still needs help.",
  "Oh, you remembered us. Interesting.",
  "Welcome back. The mediocrity missed you.",
];

export const SIGNUP_ROASTS = [
  "Creating an account won't fix your style. But it's a start.",
  "Finally joining the only club worth joining.",
  "One small step for you. One giant step for your wardrobe.",
];

export const CHECKOUT_ROASTS = [
  "Confirmed. You're less of a disappointment today.",
  "Order placed. Your future self thanks you.",
  "You actually did it. We're almost proud.",
];

export const ERROR_ROASTS = [
  "Something broke. Just like your last relationship.",
  "Error. Unlike your fashion sense, this can be fixed.",
  "Oops. Even we make mistakes. Unlike your outfit choices.",
];

export function getRandomRoast(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getHoverRoast(): string {
  return getRandomRoast(HOVER_ROASTS);
}

export function getCartRoast(): string {
  return getRandomRoast(CART_ROASTS);
}
