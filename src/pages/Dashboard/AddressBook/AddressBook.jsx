import React, { useEffect, useState } from "react";
import useUserInfo from "../../../hooks/useUserInfo";
import { useForm } from "react-hook-form";
import { City, State } from "country-state-city";
import toast from "react-hot-toast";
import useAxiosSecure from "../../../hooks/useAxiosSecure";

// This store currently ships within India only.
const COUNTRY_CODE = "IN";
const COUNTRY_NAME = "India";
const PHONE_CODE = "91";
const PHONE_NUMBER_LENGTH = 10;

// Where most customers are, so a new address starts here instead of on whatever
// happens to sort first (Andaman and Nicobar Islands). A default only — the
// dropdown stays fully editable for everyone else.
//
// NOTE for the planned country-state-city removal: these two constants and the
// blank-form guard below are the whole of this behaviour. A static India-only
// state/city dataset only needs to keep exposing an `isoCode` of "TN" for it to
// carry over unchanged; nothing here depends on the library itself.
const DEFAULT_STATE_CODE = "TN";
const DEFAULT_STATE_NAME = "Tamil Nadu";

const AddressBook = () => {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm();
  
  const [userFromDB, , refetch] = useUserInfo();
  const [shippingAdd, setShippingAdd] = useState(null);
  const [axiosSecure] = useAxiosSecure();
  const [isFormVisible, setIsFormVisible] = useState(false);

  useEffect(() => {
    if (userFromDB?.shippingAddress) {
      setShippingAdd(userFromDB.shippingAddress);
      setIsFormVisible(false);
    } else {
      setShippingAdd(null);
    }
  }, [userFromDB]);

  const [stateData, setStateData] = useState([]);
  const [cityData, setCityData] = useState([]);
  const [stateCode, setStateCode] = useState("");

  const phoneNumInfo = { phoneCode: PHONE_CODE, numberLength: PHONE_NUMBER_LENGTH };

  useEffect(() => {
    setStateData(State.getStatesOfCountry(COUNTRY_CODE));
  }, []);

  useEffect(() => {
    if (!stateData.length) return;

    // Only seed a default into a genuinely blank form. An address being edited
    // carries its own state, applied by the prefill effect below — seeding here
    // first would briefly show the wrong state, and would win outright if the
    // saved one ever failed to match.
    if (shippingAdd) return;

    const hasDefault = stateData.some((s) => s.isoCode === DEFAULT_STATE_CODE);
    setStateCode(hasDefault ? DEFAULT_STATE_CODE : stateData[0]?.isoCode);
  }, [stateData, shippingAdd]);

  useEffect(() => {
    if (stateCode) {
      const cities = City.getCitiesOfState(COUNTRY_CODE, stateCode);
      if (cities.length) {
        setCityData(cities);
      } else {
        const allCities = City.getCitiesOfCountry(COUNTRY_CODE);
        const citiesOfState = allCities.filter((city) => city.stateCode === stateCode);
        setCityData(citiesOfState);
      }
    }
  }, [stateCode]);

  // Prefill the form: from the saved address when editing, or from the
  // account name when starting a brand-new address.
  useEffect(() => {
    if (shippingAdd) {
      const matchedState = stateData.find((s) => s.name === shippingAdd.state);
      if (matchedState) {
        setStateCode(matchedState.isoCode);
      }
      reset({
        firstName: shippingAdd.firstName || "",
        lastName: shippingAdd.lastName || "",
        email: shippingAdd.email || userFromDB?.email || "",
        streetAddress: shippingAdd.streetAddress || "",
        postalCode: shippingAdd.postalCode || "",
        mobileNumber: shippingAdd.mobileNumber || "",
      });
    } else if (userFromDB) {
      const nameParts = userFromDB?.name?.split(" ") || [];
      reset({
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
      });
    }
  }, [shippingAdd, stateData, userFromDB, reset]);

  // Once the city list for the saved state has loaded, select the saved city.
  useEffect(() => {
    if (shippingAdd?.city && cityData.some((c) => c.name === shippingAdd.city)) {
      setValue("city", shippingAdd.city);
    }
  }, [cityData, shippingAdd, setValue]);

  const onSubmit = (data) => {
    const stateName = State.getStateByCodeAndCountry(data.state, COUNTRY_CODE)?.name || data.state;

    data.state = stateName;
    data.country = COUNTRY_NAME;
    data.number = `+${phoneNumInfo.phoneCode} ${data.mobileNumber}`;

    axiosSecure
      .patch(`/users/shipping-address`, data)
      .then((res) => {
        if (res.data.modifiedCount > 0 || res.data.success) {
          toast.success("Shipping address saved");
          refetch();
          setIsFormVisible(false);
        }
      })
      .catch((err) => console.error(err));
  };

  const handleDeleteAddress = () => {
    axiosSecure
      .patch(`/users/delete-address`)
      .then((res) => {
        if (res.data.modifiedCount > 0) {
          refetch();
          toast.success("Address removed");
        }
      })
      .catch((err) => console.error(err));
  };

  return (
    <div className="w-full">
      <header className="mb-12">
        <span className="font-label-caps text-label-caps text-primary tracking-[0.2em] uppercase block mb-2">
          Your Account
        </span>
        <h1 className="font-display-lg text-display-lg text-on-surface">Address Book</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        {/* Add New Address Button (Only show if form is hidden and we have less than 2 addresses conceptually, but for now just toggle form) */}
        {!isFormVisible && !shippingAdd && (
          <button 
            onClick={() => setIsFormVisible(true)}
            className="h-64 flex flex-col items-center justify-center gap-4 rounded-xl group cursor-pointer border-2 border-dashed border-primary hover:bg-primary/5 hover:border-solid transition-ui duration-300"
          >
            <div className="w-12 h-12 rounded-full border border-primary flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-ui duration-500">
              <span className="material-symbols-outlined">add</span>
            </div>
            <span className="font-button-text text-button-text text-primary uppercase">
              Add New Address
            </span>
          </button>
        )}

        {/* Existing Address Card */}
        {!isFormVisible && shippingAdd && (
          <div className="bg-surface-container-highest p-8 rounded-xl flex flex-col justify-between h-64 relative overflow-hidden group border border-primary-container/10 transition-ui duration-400 hover:border-primary-container hover:-translate-y-1 hover:shadow-[0_20px_40px_-10px_rgba(139,100,71,0.08)]">
            <div>
              <div className="flex justify-between items-start mb-6">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  {shippingAdd.firstName} {shippingAdd.lastName}
                </h3>
                <span className="px-3 py-1 border border-primary/40 text-[10px] font-label-caps text-primary uppercase tracking-widest rounded-full">
                  Default
                </span>
              </div>
              <div className="text-on-surface-variant space-y-1">
                <p className="font-body-base text-body-base">{shippingAdd.streetAddress}</p>
                <p className="font-body-base text-body-base">{shippingAdd.city}, {shippingAdd.state} - {shippingAdd.postalCode}</p>
                <p className="font-body-base text-body-base">{shippingAdd.country}</p>
              </div>
            </div>
            <div className="flex justify-between items-center mt-6">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-sm">call</span>
                <span className="font-body-base text-body-base">{shippingAdd.number}</span>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsFormVisible(true)}
                  className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                  aria-label="Edit"
                >
                  <span className="material-symbols-outlined text-[20px]">edit</span>
                </button>
                <button 
                  onClick={handleDeleteAddress}
                  className="text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                  aria-label="Delete"
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Address Form Container */}
      {isFormVisible && (
        <div className="mt-8 bg-surface-container border border-outline-variant/30 p-8 max-w-2xl animate-in fade-in duration-500 rounded-xl">
          <div className="flex justify-between items-center mb-8 border-b border-primary/10 pb-4">
            <h4 className="font-headline-sm text-headline-sm text-primary">
              {shippingAdd ? 'Edit Address' : 'New Address'}
            </h4>
            {shippingAdd && (
              <button 
                onClick={() => setIsFormVisible(false)}
                className="text-on-surface-variant hover:text-error transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="font-label-caps text-label-caps text-outline uppercase block mb-2">First Name</label>
                <input
                  type="text"
                  className="w-full bg-transparent border-0 border-b border-outline-variant py-3 px-0 focus:ring-0 text-on-surface transition-colors outline-none focus:border-primary font-body-base"
                  {...register("firstName", { required: true })}
                />
                {errors.firstName && <span className="text-error text-xs italic mt-1 block">Required</span>}
              </div>

              <div>
                <label className="font-label-caps text-label-caps text-outline uppercase block mb-2">Last Name</label>
                <input
                  type="text"
                  className="w-full bg-transparent border-0 border-b border-outline-variant py-3 px-0 focus:ring-0 text-on-surface transition-colors outline-none focus:border-primary font-body-base"
                  {...register("lastName", { required: true })}
                />
                {errors.lastName && <span className="text-error text-xs italic mt-1 block">Required</span>}
              </div>
            </div>

            <div>
              <label className="font-label-caps text-label-caps text-outline uppercase block mb-2">Email</label>
              <input
                type="email"
                className="w-full bg-transparent border-0 border-b border-outline-variant py-3 px-0 focus:ring-0 text-on-surface transition-colors outline-none focus:border-primary font-body-base"
                {...register("email", { required: true })}
                defaultValue={userFromDB?.email}
              />
              {errors.email && <span className="text-error text-xs italic mt-1 block">Required</span>}
            </div>

            <div>
              <label className="font-label-caps text-label-caps text-outline uppercase block mb-2">Street Address</label>
              <input
                type="text"
                className="w-full bg-transparent border-0 border-b border-outline-variant py-3 px-0 focus:ring-0 text-on-surface transition-colors outline-none focus:border-primary font-body-base"
                {...register("streetAddress", { required: true })}
              />
              {errors.streetAddress && <span className="text-error text-xs italic mt-1 block">Required</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="font-label-caps text-label-caps text-outline uppercase block mb-2">Country</label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={COUNTRY_NAME}
                  className="w-full bg-transparent border-0 border-b border-outline-variant py-3 px-0 text-on-surface-variant font-body-base cursor-not-allowed"
                />
              </div>
              
              <div>
                <label className="font-label-caps text-label-caps text-outline uppercase block mb-2">State</label>
                <select
                  className="w-full bg-transparent border-0 border-b border-outline-variant py-3 px-0 focus:ring-0 text-on-surface transition-colors outline-none focus:border-primary font-body-base"
                  {...register("state", { required: true })}
                  value={stateCode}
                  onChange={(e) => {
                    setStateCode(e.target.value);
                    // The previously chosen city belongs to the old state, so
                    // drop it rather than carry a mismatched pair into the
                    // order. Cleared here, on a deliberate change, rather than
                    // in an effect that would race the saved-address restore.
                    setValue("city", "");
                  }}
                >
                  {stateData?.map((state) => (
                    <option key={state.isoCode} value={state.isoCode}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="font-label-caps text-label-caps text-outline uppercase block mb-2">City</label>
                <select
                  className="w-full bg-transparent border-0 border-b border-outline-variant py-3 px-0 focus:ring-0 text-on-surface transition-colors outline-none focus:border-primary font-body-base"
                  {...register("city", { required: true })}
                  defaultValue=""
                >
                  {/* There is no sensible default city, so the form opens with
                      none chosen rather than silently selecting whichever sorts
                      first. `required` then makes the customer pick one. */}
                  <option value="" disabled>
                    Select a city
                  </option>
                  {cityData?.map((city) => (
                    <option key={city.name} value={city.name}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-label-caps text-label-caps text-outline uppercase block mb-2">Zip/Postal Code</label>
                <input
                  type="text"
                  className="w-full bg-transparent border-0 border-b border-outline-variant py-3 px-0 focus:ring-0 text-on-surface transition-colors outline-none focus:border-primary font-body-base"
                  {...register("postalCode", { required: true })}
                />
                {errors.postalCode && <span className="text-error text-xs italic mt-1 block">Required</span>}
              </div>
            </div>

            <div>
              <label className="font-label-caps text-label-caps text-outline uppercase block mb-2">Mobile Number</label>
              <div className="flex border-b border-outline-variant focus-within:border-primary transition-colors">
                <span className="py-3 pr-2 text-on-surface-variant font-body-base">+{phoneNumInfo.phoneCode}</span>
                <input
                  type="number"
                  className="w-full bg-transparent border-0 py-3 px-0 focus:ring-0 text-on-surface outline-none font-body-base"
                  {...register("mobileNumber", {
                    required: true,
                    maxLength: phoneNumInfo.numberLength,
                    minLength: phoneNumInfo.numberLength,
                  })}
                />
              </div>
              {errors.mobileNumber && (
                <span className="text-error text-xs italic mt-1 block">
                  Required length: {phoneNumInfo.numberLength} digits
                </span>
              )}
            </div>

            <div className="pt-6">
              <button
                type="submit"
                className="w-full md:w-auto font-button-text text-button-text bg-primary text-white px-10 py-4 hover:bg-primary/90 transition-ui uppercase tracking-[0.2em]"
              >
                Save Address
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AddressBook;
