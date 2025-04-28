#ifndef FT_TYPE_TRAITS_HPP
# define FT_TYPE_TRAITS_HPP

namespace ft
{
	template <bool Cond, class T = void>
	struct enable_if
	{
	};

	template <class T>
	struct enable_if<true, T>
	{
		typedef T type;
	};

	template <class T, T V>
	struct integral_constant
	{
		static const T value = V;
		typedef T value_type;
		typedef integral_constant<T, V> type;
		operator value_type() const { return value; }
	};

	typedef integral_constant<bool, true> true_type;
	typedef integral_constant<bool, false> false_type;

	template <class T>
	struct is_integral : false_type
	{
	};

	template <>
	struct is_integral<bool> : true_type
	{
	};

	template <>
	struct is_integral<char> : true_type
	{
	};

	template <>
	struct is_integral<signed char> : true_type
	{
	};

	template <>
	struct is_integral<unsigned char> : true_type
	{
	};

	template <>
	struct is_integral<wchar_t> : true_type
	{
	};

	template <>
	struct is_integral<short> : true_type
	{
	};

	template <>
	struct is_integral<unsigned short> : true_type
	{
	};

	template <>
	struct is_integral<int> : true_type
	{
	};

	template <>
	struct is_integral<unsigned int> : true_type
	{
	};

	template <>
	struct is_integral<long> : true_type
	{
	};

	template <>
	struct is_integral<unsigned long> : true_type
	{
	};
}

#endif
