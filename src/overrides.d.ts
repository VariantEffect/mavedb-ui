declare module "vue-debounce" {
    function debounce(fn: function(any): any, interval: string | number)
}

declare module "*.vue" {
  import { defineComponent } from "vue";
  const Component: ReturnType<typeof defineComponent>;
  export default Component;
}
