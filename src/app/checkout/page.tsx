'use client'

import { useState, useEffect } from 'react'
import { useCart } from '@/lib/cart'
import { useTheme } from '@/lib/theme'
import { useAuth } from '@/lib/auth-local'
import Image from 'next/image'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'
import { ArrowLeftIcon, CreditCardIcon, ShieldCheckIcon, TruckIcon } from '@heroicons/react/24/outline'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { appPath } from '@/lib/paths'

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface CheckoutFormProps {
  cartTotal: number
  cartItems: any[]
  onSuccess: () => void
}

function CheckoutForm({ cartTotal, cartItems, onSuccess }: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  useEffect(() => {
    // Create payment intent
    const createPaymentIntent = async () => {
      try {
        const response = await fetch(appPath('/api/create-payment-intent'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: Math.round(cartTotal * 100), // Convert to cents
            items: cartItems,
          }),
        })

        const { clientSecret } = await response.json()
        setClientSecret(clientSecret)
      } catch (err) {
        setError('Failed to initialize payment')
      }
    }

    createPaymentIntent()
  }, [cartTotal, cartItems])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements || !clientSecret) {
      return
    }

    setIsProcessing(true)
    setError(null)

    const cardElement = elements.getElement(CardElement)

    if (!cardElement) {
      setError('Card element not found')
      setIsProcessing(false)
      return
    }

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
      },
    })

    if (error) {
      setError(error.message || 'Payment failed')
    } else if (paymentIntent.status === 'succeeded') {
      onSuccess()
    }

    setIsProcessing(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Payment Information</h3>
        
        <div className={`p-4 rounded-lg border ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}>
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#ffffff',
                  '::placeholder': {
                    color: '#9ca3af',
                  },
                },
                invalid: {
                  color: '#ef4444',
                },
              },
            }}
          />
        </div>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}
      </div>

      <button
        type="submit"
        disabled={!stripe || isProcessing || !clientSecret}
        className="w-full btn-primary py-3 text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? 'Processing...' : `Pay € ${cartTotal.toFixed(2).replace('.', ',')}`}
      </button>
    </form>
  )
}

export default function CheckoutPage() {
  const { state: cartState, clearCart } = useCart()
  const { theme } = useTheme()
  const { user } = useAuth()
  const [isSuccess, setIsSuccess] = useState(false)
  const [customerInfo, setCustomerInfo] = useState({
    email: user?.email || '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'AE', // United Arab Emirates as default
    phone: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setCustomerInfo(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSuccess = () => {
    setIsSuccess(true)
    clearCart()
  }

  if (cartState.items.length === 0 && !isSuccess) {
    return (
      <div className={`flex min-h-screen transition-colors duration-200 ${
        theme === 'dark' ? 'bg-dark-900' : 'bg-gray-50'
      } overflow-x-hidden`}>
        <Sidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className={`transition-colors duration-200 ${
            theme === 'dark' ? 'bg-dark-800 border-dark-700' : 'bg-white border-gray-200'
          } border-b px-4 sm:px-6 lg:px-8 py-4`}>
            <div className="flex items-center justify-between">
              <h1 className={`text-2xl font-bold transition-colors ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>Checkout</h1>
            </div>
          </div>

          <main className={`flex-1 flex items-center justify-center transition-colors duration-200 ${
            theme === 'dark' ? 'bg-dark-900' : 'bg-gray-50'
          }`}>
            <div className="text-center">
              <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center transition-colors ${
                theme === 'dark' ? 'bg-dark-800' : 'bg-white'
              }`}>
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h2 className={`text-2xl font-bold mb-2 transition-colors ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>Your cart is empty</h2>
              <p className={`mb-6 transition-colors ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>Add some products to your cart before checking out.</p>
              <Link 
                href="/"
                className="btn-primary inline-flex items-center space-x-2"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                <span>Continue Shopping</span>
              </Link>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className={`flex min-h-screen transition-colors duration-200 ${
        theme === 'dark' ? 'bg-dark-900' : 'bg-gray-50'
      } overflow-x-hidden`}>
        <Sidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className={`transition-colors duration-200 ${
            theme === 'dark' ? 'bg-dark-800 border-dark-700' : 'bg-white border-gray-200'
          } border-b px-4 sm:px-6 lg:px-8 py-4`}>
            <div className="flex items-center justify-between">
              <h1 className={`text-2xl font-bold transition-colors ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>Checkout</h1>
            </div>
          </div>

          <main className={`flex-1 flex items-center justify-center transition-colors duration-200 ${
            theme === 'dark' ? 'bg-dark-900' : 'bg-gray-50'
          }`}>
            <div className="text-center max-w-md mx-auto">
              <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center transition-colors ${
                theme === 'dark' ? 'bg-green-800' : 'bg-green-100'
              }`}>
                <ShieldCheckIcon className="w-12 h-12 text-green-500" />
              </div>
              <h2 className={`text-2xl font-bold mb-2 transition-colors ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>Payment Successful!</h2>
              <p className={`mb-6 transition-colors ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Thank you for your purchase. You will receive a confirmation email shortly.
              </p>
              <div className="space-y-3">
                <Link 
                  href="/"
                  className="btn-primary inline-flex items-center space-x-2"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                  <span>Continue Shopping</span>
                </Link>
                <div>
                  <Link 
                    href="/orders"
                    className={`text-sm transition-colors ${
                      theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    View Order History
                  </Link>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex min-h-screen transition-colors duration-200 ${
      theme === 'dark' ? 'bg-dark-900' : 'bg-gray-50'
    } overflow-x-hidden`}>
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className={`transition-colors duration-200 ${
          theme === 'dark' ? 'bg-dark-800 border-dark-700' : 'bg-white border-gray-200'
        } border-b px-4 sm:px-6 lg:px-8 py-4`}>
          <div className="flex items-center space-x-4">
            <Link href="/cart" className={`transition-colors ${
              theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}>
              <ArrowLeftIcon className="w-6 h-6" />
            </Link>
            <h1 className={`text-2xl font-bold transition-colors ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>Checkout</h1>
          </div>
        </div>

        <main className={`flex-1 p-4 sm:p-6 overflow-x-hidden transition-colors duration-200 ${
          theme === 'dark' ? 'bg-dark-900' : 'bg-gray-50'
        }`}>
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Checkout Form */}
              <div className="space-y-8">
                {/* Customer Information */}
                <div className={`rounded-lg p-6 border transition-colors ${
                  theme === 'dark' 
                    ? 'bg-dark-800 border-dark-700' 
                    : 'bg-white border-gray-200'
                }`}>
                  <h2 className={`text-xl font-semibold mb-4 transition-colors ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Customer Information</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 transition-colors ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>First Name *</label>
                      <input
                        type="text"
                        name="firstName"
                        value={customerInfo.firstName}
                        onChange={handleInputChange}
                        required
                        className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                          theme === 'dark'
                            ? 'bg-dark-700 border-dark-600 text-white focus:border-primary-500'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-primary-500'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 transition-colors ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>Last Name *</label>
                      <input
                        type="text"
                        name="lastName"
                        value={customerInfo.lastName}
                        onChange={handleInputChange}
                        required
                        className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                          theme === 'dark'
                            ? 'bg-dark-700 border-dark-600 text-white focus:border-primary-500'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-primary-500'
                        }`}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className={`block text-sm font-medium mb-2 transition-colors ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={customerInfo.email}
                        onChange={handleInputChange}
                        required
                        className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                          theme === 'dark'
                            ? 'bg-dark-700 border-dark-600 text-white focus:border-primary-500'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-primary-500'
                        }`}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className={`block text-sm font-medium mb-2 transition-colors ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>Address *</label>
                      <input
                        type="text"
                        name="address"
                        value={customerInfo.address}
                        onChange={handleInputChange}
                        required
                        className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                          theme === 'dark'
                            ? 'bg-dark-700 border-dark-600 text-white focus:border-primary-500'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-primary-500'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 transition-colors ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>City *</label>
                      <input
                        type="text"
                        name="city"
                        value={customerInfo.city}
                        onChange={handleInputChange}
                        required
                        className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                          theme === 'dark'
                            ? 'bg-dark-700 border-dark-600 text-white focus:border-primary-500'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-primary-500'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 transition-colors ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>Postal Code *</label>
                      <input
                        type="text"
                        name="postalCode"
                        value={customerInfo.postalCode}
                        onChange={handleInputChange}
                        required
                        className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                          theme === 'dark'
                            ? 'bg-dark-700 border-dark-600 text-white focus:border-primary-500'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-primary-500'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 transition-colors ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>Country *</label>
                      <select
                        name="country"
                        value={customerInfo.country}
                        onChange={handleInputChange}
                        required
                        className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                          theme === 'dark'
                            ? 'bg-dark-700 border-dark-600 text-white focus:border-primary-500'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-primary-500'
                        }`}
                      >
                        <option value="AF">Afghanistan</option>
                        <option value="AL">Albania</option>
                        <option value="DZ">Algeria</option>
                        <option value="AS">American Samoa</option>
                        <option value="AD">Andorra</option>
                        <option value="AO">Angola</option>
                        <option value="AI">Anguilla</option>
                        <option value="AQ">Antarctica</option>
                        <option value="AG">Antigua and Barbuda</option>
                        <option value="AR">Argentina</option>
                        <option value="AM">Armenia</option>
                        <option value="AW">Aruba</option>
                        <option value="AU">Australia</option>
                        <option value="AT">Austria</option>
                        <option value="AZ">Azerbaijan</option>
                        <option value="BS">Bahamas</option>
                        <option value="BH">Bahrain</option>
                        <option value="BD">Bangladesh</option>
                        <option value="BB">Barbados</option>
                        <option value="BY">Belarus</option>
                        <option value="BE">Belgium</option>
                        <option value="BZ">Belize</option>
                        <option value="BJ">Benin</option>
                        <option value="BM">Bermuda</option>
                        <option value="BT">Bhutan</option>
                        <option value="BO">Bolivia</option>
                        <option value="BA">Bosnia and Herzegovina</option>
                        <option value="BW">Botswana</option>
                        <option value="BV">Bouvet Island</option>
                        <option value="BR">Brazil</option>
                        <option value="IO">British Indian Ocean Territory</option>
                        <option value="BN">Brunei Darussalam</option>
                        <option value="BG">Bulgaria</option>
                        <option value="BF">Burkina Faso</option>
                        <option value="BI">Burundi</option>
                        <option value="KH">Cambodia</option>
                        <option value="CM">Cameroon</option>
                        <option value="CA">Canada</option>
                        <option value="CV">Cape Verde</option>
                        <option value="KY">Cayman Islands</option>
                        <option value="CF">Central African Republic</option>
                        <option value="TD">Chad</option>
                        <option value="CL">Chile</option>
                        <option value="CN">China</option>
                        <option value="CX">Christmas Island</option>
                        <option value="CC">Cocos (Keeling) Islands</option>
                        <option value="CO">Colombia</option>
                        <option value="KM">Comoros</option>
                        <option value="CG">Congo</option>
                        <option value="CD">Congo, Democratic Republic of the</option>
                        <option value="CK">Cook Islands</option>
                        <option value="CR">Costa Rica</option>
                        <option value="CI">Côte d'Ivoire</option>
                        <option value="HR">Croatia</option>
                        <option value="CU">Cuba</option>
                        <option value="CY">Cyprus</option>
                        <option value="CZ">Czech Republic</option>
                        <option value="DK">Denmark</option>
                        <option value="DJ">Djibouti</option>
                        <option value="DM">Dominica</option>
                        <option value="DO">Dominican Republic</option>
                        <option value="EC">Ecuador</option>
                        <option value="EG">Egypt</option>
                        <option value="SV">El Salvador</option>
                        <option value="GQ">Equatorial Guinea</option>
                        <option value="ER">Eritrea</option>
                        <option value="EE">Estonia</option>
                        <option value="ET">Ethiopia</option>
                        <option value="FK">Falkland Islands (Malvinas)</option>
                        <option value="FO">Faroe Islands</option>
                        <option value="FJ">Fiji</option>
                        <option value="FI">Finland</option>
                        <option value="FR">France</option>
                        <option value="GF">French Guiana</option>
                        <option value="PF">French Polynesia</option>
                        <option value="TF">French Southern Territories</option>
                        <option value="GA">Gabon</option>
                        <option value="GM">Gambia</option>
                        <option value="GE">Georgia</option>
                        <option value="DE">Germany</option>
                        <option value="GH">Ghana</option>
                        <option value="GI">Gibraltar</option>
                        <option value="GR">Greece</option>
                        <option value="GL">Greenland</option>
                        <option value="GD">Grenada</option>
                        <option value="GP">Guadeloupe</option>
                        <option value="GU">Guam</option>
                        <option value="GT">Guatemala</option>
                        <option value="GG">Guernsey</option>
                        <option value="GN">Guinea</option>
                        <option value="GW">Guinea-Bissau</option>
                        <option value="GY">Guyana</option>
                        <option value="HT">Haiti</option>
                        <option value="HM">Heard Island and McDonald Islands</option>
                        <option value="VA">Holy See (Vatican City State)</option>
                        <option value="HN">Honduras</option>
                        <option value="HK">Hong Kong</option>
                        <option value="HU">Hungary</option>
                        <option value="IS">Iceland</option>
                        <option value="IN">India</option>
                        <option value="ID">Indonesia</option>
                        <option value="IR">Iran, Islamic Republic of</option>
                        <option value="IQ">Iraq</option>
                        <option value="IE">Ireland</option>
                        <option value="IM">Isle of Man</option>
                        <option value="IL">Israel</option>
                        <option value="IT">Italy</option>
                        <option value="JM">Jamaica</option>
                        <option value="JP">Japan</option>
                        <option value="JE">Jersey</option>
                        <option value="JO">Jordan</option>
                        <option value="KZ">Kazakhstan</option>
                        <option value="KE">Kenya</option>
                        <option value="KI">Kiribati</option>
                        <option value="KP">Korea, Democratic People's Republic of</option>
                        <option value="KR">Korea, Republic of</option>
                        <option value="KW">Kuwait</option>
                        <option value="KG">Kyrgyzstan</option>
                        <option value="LA">Lao People's Democratic Republic</option>
                        <option value="LV">Latvia</option>
                        <option value="LB">Lebanon</option>
                        <option value="LS">Lesotho</option>
                        <option value="LR">Liberia</option>
                        <option value="LY">Libya</option>
                        <option value="LI">Liechtenstein</option>
                        <option value="LT">Lithuania</option>
                        <option value="LU">Luxembourg</option>
                        <option value="MO">Macao</option>
                        <option value="MK">Macedonia, the former Yugoslav Republic of</option>
                        <option value="MG">Madagascar</option>
                        <option value="MW">Malawi</option>
                        <option value="MY">Malaysia</option>
                        <option value="MV">Maldives</option>
                        <option value="ML">Mali</option>
                        <option value="MT">Malta</option>
                        <option value="MH">Marshall Islands</option>
                        <option value="MQ">Martinique</option>
                        <option value="MR">Mauritania</option>
                        <option value="MU">Mauritius</option>
                        <option value="YT">Mayotte</option>
                        <option value="MX">Mexico</option>
                        <option value="FM">Micronesia, Federated States of</option>
                        <option value="MD">Moldova, Republic of</option>
                        <option value="MC">Monaco</option>
                        <option value="MN">Mongolia</option>
                        <option value="ME">Montenegro</option>
                        <option value="MS">Montserrat</option>
                        <option value="MA">Morocco</option>
                        <option value="MZ">Mozambique</option>
                        <option value="MM">Myanmar</option>
                        <option value="NA">Namibia</option>
                        <option value="NR">Nauru</option>
                        <option value="NP">Nepal</option>
                        <option value="NL">Netherlands</option>
                        <option value="NC">New Caledonia</option>
                        <option value="NZ">New Zealand</option>
                        <option value="NI">Nicaragua</option>
                        <option value="NE">Niger</option>
                        <option value="NG">Nigeria</option>
                        <option value="NU">Niue</option>
                        <option value="NF">Norfolk Island</option>
                        <option value="MP">Northern Mariana Islands</option>
                        <option value="NO">Norway</option>
                        <option value="OM">Oman</option>
                        <option value="PK">Pakistan</option>
                        <option value="PW">Palau</option>
                        <option value="PS">Palestinian Territory, Occupied</option>
                        <option value="PA">Panama</option>
                        <option value="PG">Papua New Guinea</option>
                        <option value="PY">Paraguay</option>
                        <option value="PE">Peru</option>
                        <option value="PH">Philippines</option>
                        <option value="PN">Pitcairn</option>
                        <option value="PL">Poland</option>
                        <option value="PT">Portugal</option>
                        <option value="PR">Puerto Rico</option>
                        <option value="QA">Qatar</option>
                        <option value="RE">Réunion</option>
                        <option value="RO">Romania</option>
                        <option value="RU">Russian Federation</option>
                        <option value="RW">Rwanda</option>
                        <option value="BL">Saint Barthélemy</option>
                        <option value="SH">Saint Helena, Ascension and Tristan da Cunha</option>
                        <option value="KN">Saint Kitts and Nevis</option>
                        <option value="LC">Saint Lucia</option>
                        <option value="MF">Saint Martin (French part)</option>
                        <option value="PM">Saint Pierre and Miquelon</option>
                        <option value="VC">Saint Vincent and the Grenadines</option>
                        <option value="WS">Samoa</option>
                        <option value="SM">San Marino</option>
                        <option value="ST">Sao Tome and Principe</option>
                        <option value="SA">Saudi Arabia</option>
                        <option value="SN">Senegal</option>
                        <option value="RS">Serbia</option>
                        <option value="SC">Seychelles</option>
                        <option value="SL">Sierra Leone</option>
                        <option value="SG">Singapore</option>
                        <option value="SX">Sint Maarten (Dutch part)</option>
                        <option value="SK">Slovakia</option>
                        <option value="SI">Slovenia</option>
                        <option value="SB">Solomon Islands</option>
                        <option value="SO">Somalia</option>
                        <option value="ZA">South Africa</option>
                        <option value="GS">South Georgia and the South Sandwich Islands</option>
                        <option value="SS">South Sudan</option>
                        <option value="ES">Spain</option>
                        <option value="LK">Sri Lanka</option>
                        <option value="SD">Sudan</option>
                        <option value="SR">Suriname</option>
                        <option value="SJ">Svalbard and Jan Mayen</option>
                        <option value="SZ">Swaziland</option>
                        <option value="SE">Sweden</option>
                        <option value="CH">Switzerland</option>
                        <option value="SY">Syrian Arab Republic</option>
                        <option value="TW">Taiwan, Province of China</option>
                        <option value="TJ">Tajikistan</option>
                        <option value="TZ">Tanzania, United Republic of</option>
                        <option value="TH">Thailand</option>
                        <option value="TL">Timor-Leste</option>
                        <option value="TG">Togo</option>
                        <option value="TK">Tokelau</option>
                        <option value="TO">Tonga</option>
                        <option value="TT">Trinidad and Tobago</option>
                        <option value="TN">Tunisia</option>
                        <option value="TR">Turkey</option>
                        <option value="TM">Turkmenistan</option>
                        <option value="TC">Turks and Caicos Islands</option>
                        <option value="TV">Tuvalu</option>
                        <option value="UG">Uganda</option>
                        <option value="UA">Ukraine</option>
                        <option value="AE">United Arab Emirates</option>
                        <option value="GB">United Kingdom</option>
                        <option value="US">United States</option>
                        <option value="UM">United States Minor Outlying Islands</option>
                        <option value="UY">Uruguay</option>
                        <option value="UZ">Uzbekistan</option>
                        <option value="VU">Vanuatu</option>
                        <option value="VE">Venezuela, Bolivarian Republic of</option>
                        <option value="VN">Viet Nam</option>
                        <option value="VG">Virgin Islands, British</option>
                        <option value="VI">Virgin Islands, U.S.</option>
                        <option value="WF">Wallis and Futuna</option>
                        <option value="EH">Western Sahara</option>
                        <option value="YE">Yemen</option>
                        <option value="ZM">Zambia</option>
                        <option value="ZW">Zimbabwe</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 transition-colors ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        value={customerInfo.phone}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                          theme === 'dark'
                            ? 'bg-dark-700 border-dark-600 text-white focus:border-primary-500'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-primary-500'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className={`rounded-lg p-6 border transition-colors ${
                  theme === 'dark' 
                    ? 'bg-dark-800 border-dark-700' 
                    : 'bg-white border-gray-200'
                }`}>
                  <div className="flex items-center space-x-2 mb-4">
                    <CreditCardIcon className="w-6 h-6 text-primary-500" />
                    <h2 className={`text-xl font-semibold transition-colors ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>Payment Method</h2>
                  </div>
                  
                  <Elements stripe={stripePromise}>
                    <CheckoutForm 
                      cartTotal={cartState.total}
                      cartItems={cartState.items}
                      onSuccess={handleSuccess}
                    />
                  </Elements>
                </div>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className={`rounded-lg p-6 border sticky top-8 transition-colors ${
                  theme === 'dark' 
                    ? 'bg-dark-800 border-dark-700' 
                    : 'bg-white border-gray-200'
                }`}>
                  <h2 className={`text-xl font-bold mb-4 transition-colors ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Order Summary</h2>
                  
                  {/* Cart Items */}
                  <div className="space-y-4 mb-6">
                    {cartState.items.map((item) => (
                      <div key={item.id} className="flex items-center space-x-3">
                        <div className="relative w-16 h-16 flex-shrink-0">
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
                            className="object-cover rounded-lg"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-medium text-sm line-clamp-2 transition-colors ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                            {item.name}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <span className="text-primary-500 font-bold text-sm">
                              € {item.price.toFixed(2).replace('.', ',')}
                            </span>
                            <span className={`text-sm transition-colors ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              x {item.quantity}
                            </span>
                          </div>
                        </div>
                        <div className={`font-medium transition-colors ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          € {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="space-y-3 mb-6">
                    <div className={`flex justify-between transition-colors ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      <span>Subtotal ({cartState.itemCount} items)</span>
                      <span>€ {cartState.total.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div className={`flex justify-between transition-colors ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      <span>Shipping</span>
                      <span>Free</span>
                    </div>
                    <div className={`flex justify-between transition-colors ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      <span>Tax</span>
                      <span>Calculated at checkout</span>
                    </div>
                    <div className={`border-t pt-3 ${
                      theme === 'dark' ? 'border-dark-600' : 'border-gray-300'
                    }`}>
                      <div className={`flex justify-between text-lg font-bold transition-colors ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        <span>Total</span>
                        <span>€ {cartState.total.toFixed(2).replace('.', ',')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Security Features */}
                  <div className="space-y-3 text-sm">
                    <div className={`flex items-center space-x-2 transition-colors ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <ShieldCheckIcon className="w-4 h-4" />
                      <span>Secure 256-bit SSL encryption</span>
                    </div>
                    <div className={`flex items-center space-x-2 transition-colors ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <TruckIcon className="w-4 h-4" />
                      <span>Free shipping on all orders</span>
                    </div>
                    <div className={`flex items-center space-x-2 transition-colors ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <CreditCardIcon className="w-4 h-4" />
                      <span>Accepted payment methods: Visa, Mastercard, American Express</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}