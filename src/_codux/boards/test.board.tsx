import "./test.board.css";
import React from "react";
import { createBoard } from "@wixc3/react-board";

export default createBoard({
  name: "Test",
  Board: () => (
    <div className="TestBoard_div1">
      <div className="TestBoard_div2" />
    </div>
  ),
});
