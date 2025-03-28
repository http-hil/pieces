import "./button.board.css";
import React from "react";
import { createBoard } from "@wixc3/react-board";
import { Button } from "../../../components/button";

export default createBoard({
  name: "Button",
  Board: () => (
    <Button color="#000" className="ButtonBoard_button">
      Click Me
    </Button>
    <div className="bg-"
  ),
});
