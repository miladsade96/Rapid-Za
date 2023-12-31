import {Form, redirect, useActionData, useNavigation} from "react-router-dom";
import {createOrder} from "../../services/apiRestaurant.js";
import Button from "../../ui/Button.jsx";
import {useDispatch, useSelector} from "react-redux";
import {clearCart, getCart, getCartTotalPrice} from "../cart/cartSlice.js";
import EmptyCart from "../cart/EmptyCart.jsx";
import store from "../../store.js";
import {formatCurrency} from "../../utils/helpers.js";
import {useState} from "react";
import {fetchAddress} from "../user/userSlice.js";

// https://uibakery.io/regex-library/phone-number
const isValidPhone = str =>
	/^\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/.test(str);

function CreateOrder() {
	const {
		username,
		status: addressStatus,
		position,
		address,
		error: errorAddress,
	} = useSelector(state => state.user);
	const isLoadingAddress = addressStatus === "loading";
	const navigation = useNavigation();
	const isSubmitting = navigation.state === "submitting";
	const formErrors = useActionData();
	const [withPriority, setWithPriority] = useState(false);
	const cart = useSelector(getCart);
	const totalCartPrice = useSelector(getCartTotalPrice);
	const priorityPrice = withPriority ? totalCartPrice * 0.2 : 0;
	const totalPrice = totalCartPrice + priorityPrice;
	const dispatch = useDispatch();

	if (!cart.length) return <EmptyCart />;
	return (
		<div className="px-4 py-6">
			{/* eslint-disable-next-line react/no-unescaped-entities */}
			<h2 className="text-xl font-semibold mb-8">Ready to order? Let's go!</h2>

			<Form method="POST">
				<div className="mb-5 flex flex-col sm:flex-row sm:items-center">
					<label className="sm:basis-40">First Name</label>
					<input
						className="input grow ml-0 sm:ml-2"
						defaultValue={username}
						type="text"
						name="customer"
						required
					/>
				</div>

				<div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
					<label className="sm:basis-40">Phone number</label>
					<div className="grow">
						<input className="input w-full" type="tel" name="phone" required />
						{formErrors?.phone && (
							<p className="text-xs mt-2 text-red-700 bg-red-100 p-2 rounded-md">
								{formErrors.phone}
							</p>
						)}
					</div>
				</div>

				<div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center relative">
					<label className="sm:basis-40">Address</label>
					<div className="grow">
						<input
							className="input w-full"
							type="text"
							name="address"
							required
							disabled={isLoadingAddress}
							defaultValue={address}
						/>
						{addressStatus === "error" && (
							<p className="text-xs mt-2 text-red-700 bg-red-100 p-2 rounded-md">{errorAddress}</p>
						)}
					</div>
					{!position.latitude && !position.longitude && (
						<span className="absolute right-[3px] top-[34px] z-50 sm:right-[3px] sm:top-[2px] md:top-[4px]">
							<Button
								disabled={isLoadingAddress}
								type="small"
								onClick={e => {
									e.preventDefault();
									dispatch(fetchAddress());
								}}>
								Get position
							</Button>
						</span>
					)}
				</div>

				<div className="mb-12 flex items-center gap-5">
					<input
						className="h-6 w-6 accent-yellow-400 focus:outline-none focus:ring
						focus:ring-yellow-400 focus:ring-offset-2"
						type="checkbox"
						name="priority"
						id="priority"
						value={withPriority}
						onChange={e => setWithPriority(e.target.checked)}
					/>
					<label className="font-medium" htmlFor="priority">
						Want to yo give your order priority?
					</label>
				</div>

				<div>
					<input type="hidden" name="cart" value={JSON.stringify(cart)} />
					<input
						type="hidden"
						name="position"
						value={
							position.latitude && position.longitude
								? `${position.latitude}, ${position.longitude}`
								: ""
						}
					/>
					<Button type="primary" disabled={isSubmitting || isLoadingAddress}>
						{isSubmitting ? "Placing order..." : `Order now for ${formatCurrency(totalPrice)}`}
					</Button>
				</div>
			</Form>
		</div>
	);
}

export async function action({request}) {
	const formData = await request.formData();
	const data = Object.fromEntries(formData);
	const order = {...data, cart: JSON.parse(data.cart), priority: data.priority === "true"};
	const errors = {};
	if (!isValidPhone(order.phone))
		errors.phone = "Please give us your correct phone number. We might need it to contact you";
	if (Object.keys(errors).length > 0) return errors;

	const newOrder = await createOrder(order);
	// DO NOT OVERUSE
	store.dispatch(clearCart());

	return redirect(`/order/${newOrder.id}`);
}
export default CreateOrder;
