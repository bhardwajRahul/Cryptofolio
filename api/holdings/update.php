<?php
	header("Access-Control-Allow-Origin: *");
	header("Content-Type: application/json");

	if($_SERVER["REQUEST_METHOD"] == "UPDATE") {
		$input = json_decode(file_get_contents("php://input"), true);

		$id = !empty($input["id"]) ? $input["id"] : die();
		$amount = !empty($input["amount"]) ? $input["amount"] : die();

		$utils = require_once("../utils.php");
		$helper = new Utils();

		$current = json_decode(file_get_contents($helper->holdingsFile), true);
		
		if(array_key_exists($id, $current)) {
			$current[$id]["amount"] = $amount;

			$update = file_put_contents($helper->holdingsFile, json_encode($current));

			if($update) {
				echo json_encode(array("message" => "The asset has been updated."));
			} else {
				echo json_encode(array("error" => "Asset couldn't be updated."));
			}
		} else {
			echo json_encode(array("error" => "Asset not found."));
		}
	} else {
		echo json_encode(array("error" => "Wrong request method. Please use UPDATE."));
	}
?>