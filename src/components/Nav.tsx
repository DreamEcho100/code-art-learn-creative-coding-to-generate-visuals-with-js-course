import { A, useLocation } from "@solidjs/router";
import { For } from "solid-js";

export default function Nav() {
  const location = useLocation();
  const active = (path: string) =>
    path === location.pathname
      ? "border-sky-600"
      : "border-transparent hover:border-sky-600";

  const navItems = [
    {
      href: "/",
      title: "Home",
    },
    {
      href: "/about",
      title: "About",
    },
    {
      href: "/particles",
      title: "Particles",
    },
  ];

  return (
    <nav class="bg-sky-800">
      <ul class="container flex items-center p-3 text-gray-200 gap-1.5">
        <For each={navItems}>
          {(item) => (
            <li class={`border-b-2 ${active(item.href)} mx-1.5 sm:mx-6`}>
              <A href={item.href} rel="noopener">
                {item.title}
              </A>
            </li>
          )}
        </For>
      </ul>
    </nav>
  );
}
