import React from "react";
import { createBoard } from "@wixc3/react-board";
import { StackedLayout } from "../../../components/stacked-layout";

export default createBoard({
  name: "StackedLayout",
  Board: () => (
    <StackedLayout
      navbar={<div>Navbar Content</div>}
      sidebar={<div>Sidebar Content</div>}
    >
      <div>Main Content</div>
    </StackedLayout>
  ),
});
